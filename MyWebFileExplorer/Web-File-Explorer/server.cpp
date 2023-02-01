#include "server.h"
#include <string>
#include "../../resource/tool.h"
#include "../includes/ConvertUTF.h"
#include "../includes/RangeParser.h"
using namespace drogon;

using namespace std;


struct TAuthTokenList {
	vector <string> normal;
	HWND hwnd{};
	UINT uMsgCheck{};
} AuthTokenList;

/*
VerifyAuthToken 中的数据结构的代码表示
(不完全一致)
struct TAuthInfo {
	size_t nLength;
	WCHAR str;
};
*/


void InitAuthTokenVerify(CmdLineW& cl) {
	wstring tok;
	if (!cl.getopt(L"token", tok)) return;

	if (tok.starts_with(L"Window;")) {
		/*
		--token=Window;123;456
			123: HWND 的数字形式
			456: 用于验证的自定义Message
		*/
		wstring p1, p2;
		tok.erase(0, 7);
		p1 = tok.substr(0, tok.find_first_of(L';'));
		p2 = tok.substr(tok.find_first_of(L';') + 1);
		
		// p1 是HWND    p2 是用于验证的自定义消息
		AuthTokenList.hwnd = (HWND)(LONG_PTR)(PVOID)atoll(ws2c(p1));
		AuthTokenList.uMsgCheck = (UINT)(int)atoi(ws2c(p2));

	}
	else if (tok.starts_with(L"File;")) {
		// File;C:\Path\To\File.txt
		tok.erase(0, 7);
		fstream fp(tok);
		if (fp) {
			char* buffer = new char[4096];
			while ((fp.getline(buffer, 4096))) {
				// TODO: 此处做法待验证，可能需要去除换行等
				AuthTokenList.normal.push_back(buffer);
			}
		}
	}
	else {
		// token 参数就是一条字符串token
		AuthTokenList.normal.push_back(ws2s(tok));
	}

}

bool __stdcall VerifyAuthToken(std::string tok) {
	if (tok.length() > 2048) return false;
	for (auto& i : AuthTokenList.normal) {
		if (i == tok) return true;
	}
	if (IsWindow(AuthTokenList.hwnd)) {
		wstring ws = s2ws(tok);
		PCWSTR p = ws.c_str();
		size_t len = (ws.length() + 1) * sizeof(WCHAR);
		PVOID pAddr = VirtualAlloc(NULL, (sizeof(len) + len), MEM_COMMIT, PAGE_READWRITE);
		if (!pAddr) return false;
#pragma warning(push)
#pragma warning(disable: 6386)
		memcpy(pAddr, &len, sizeof(len)); // 已经确认没有问题
		size_t* szStartAddr = ((size_t*)pAddr) + 1;
		memcpy(szStartAddr, p, len);
#pragma warning(pop)

		LRESULT result = SendMessage(AuthTokenList.hwnd, AuthTokenList.uMsgCheck,
			(WPARAM)GetCurrentProcessId(), (LPARAM)(LONG_PTR)pAddr);

		VirtualFree(pAddr, 0, MEM_RELEASE);
		if (result == 0x1006F0AC) return true;

	}
	return false;
}




void server::AuthFilter::doFilter(const HttpRequestPtr& req, FilterCallback&& fcb, FilterChainCallback&& fccb)
{
	string authToken = req->getHeader("x-auth-token");
	if (req->method() == Options || VerifyAuthToken(authToken)) {
		return fccb();
	}
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	resp->addHeader("access-control-allow-origin", "*");
	resp->addHeader("access-control-allow-methods", req->getHeader("access-control-request-method") + ",OPTIONS");
	resp->addHeader("access-control-allow-headers", req->getHeader("access-control-request-headers"));
	resp->setStatusCode(k401Unauthorized);
	resp->setBody("");
	fcb(resp);
}




void server::FileServer::auth(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	resp->addHeader("access-control-allow-origin", req->getHeader("origin"));
	resp->addHeader("access-control-allow-methods", "POST,OPTIONS");
	resp->addHeader("access-control-allow-headers", req->getHeader("access-control-request-headers"));
	resp->addHeader("access-control-max-age", "300");
	resp->setContentTypeCode(CT_APPLICATION_JSON);
	resp->setBody("{success:true}");
	callback(resp);
}

void server::FileServer::downloadFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file, std::string&& tok, std::string&& attachment, std::string&& mimeType) const
{
	if ((req->method() != Options) && !VerifyAuthToken(tok)) {
		HttpResponsePtr resp = HttpResponse::newHttpResponse();
		resp->setStatusCode(k403Forbidden);
		return callback(resp);
	}

	wstring wsfile; llvm::ConvertUTF8toWide(file, wsfile);

	auto fstat = IsFileOrDirectory(wsfile);
	if (fstat != 1) {
		HttpResponsePtr resp = HttpResponse::newHttpResponse();
		CORSadd(req, resp);
		resp->setStatusCode(fstat == -1 ? k400BadRequest : k404NotFound);
		return callback(resp);
	}

	HANDLE hFile = CreateFileW(wsfile.c_str(), GENERIC_READ, FILE_SHARE_READ,
		0, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, 0);
	if (!hFile || hFile == INVALID_HANDLE_VALUE) {
		auto resp = HttpResponse::newHttpResponse();
		CORSadd(req, resp);
		resp->setStatusCode(k500InternalServerError);
		return callback(resp);
	}
	FILETIME ft{};
	GetFileTime(hFile, NULL, NULL, &ft);
	CloseHandle(hFile);
	string ftstr = "\"a" + to_string(ft.dwLowDateTime) + "b" + to_string(ft.dwHighDateTime) + "\"";

	size_t offset = 0, length = 0;
	const std::string& rangeStr = req->getHeader("range");
	// these are copied and modified from
	// https://github.com/drogonframework/drogon/blob/0b3147c15764820c2624a557b83b2b3343d9810a/lib/src/StaticFileRouter.cc#L352
	if (!rangeStr.empty())
	do {
		// Check If-Range precondition
		const std::string &ifRange = req->getHeader("if-range");
		if (!ifRange.empty()) {
			if (ifRange != ftstr) break;
		}
		std::vector<FileRange> ranges;
		switch (parseRangeHeader(rangeStr, (size_t)MyGetFileSizeW(wsfile), ranges))
		{
		case FileRangeParseResult::SinglePart:
		case FileRangeParseResult::MultiPart:
		{
			auto& firstRange = ranges.front();
			offset = firstRange.start;
			length = firstRange.end - firstRange.start;
		}
		break;
		case FileRangeParseResult::NotSatisfiable:
		case FileRangeParseResult::InvalidRange:
		{
			auto resp = HttpResponse::newHttpResponse();
			CORSadd(req, resp);
			resp->setStatusCode(k416RequestedRangeNotSatisfiable);
			return callback(resp);
		}
		break;
		/** rfc7233 4.4.
			* > Note: Because servers are free to ignore Range, many
			* implementations will simply respond with the entire selected
			* representation in a 200 (OK) response.  That is partly
			* because most clients are prepared to receive a 200 (OK) to
			* complete the task (albeit less efficiently) and partly
			* because clients might not stop making an invalid partial
			* request until they have received a complete representation.
			* Thus, clients cannot depend on receiving a 416 (Range Not
			* Satisfiable) response even when it is most appropriate.
			*/
		default:
			break;
		}
	} while (0);

	HttpResponsePtr resp = HttpResponse::newFileResponse(file, offset, length, true, attachment);
	CORSadd(req, resp);
	if (!mimeType.empty()) {
		resp->setContentTypeString(mimeType);
		resp->addHeader("x-content-type-options", "nosniff");
	}
	resp->addHeader("accept-ranges", "bytes");
	resp->addHeader("cache-control", "no-cache");
	resp->addHeader("etag", ftstr);
	callback(resp);
}

void server::FileServer::getFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const
{
	wstring wsfile; llvm::ConvertUTF8toWide(file, wsfile);
	auto fstat = IsFileOrDirectory(wsfile);
	if (fstat != 1) {
		HttpResponsePtr resp = HttpResponse::newHttpResponse();
		CORSadd(req, resp);
		resp->setStatusCode(fstat == -1 ? k400BadRequest : k404NotFound);
		return callback(resp);
	}

	HttpResponsePtr resp = HttpResponse::newFileResponse(file);
	CORSadd(req, resp);
	callback(resp);
}

enum class FilePutType {
	NoOverride = 0,
	Override = 1,
	Append = 2,
	Truncate = 3,
	Insert = 4,
};

static HttpResponsePtr PutFile(const HttpRequestPtr& req, wstring wsfile,
	FilePutType type = FilePutType::NoOverride, ULONGLONG offset = 0
) {
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);

	HANDLE hFile = NULL;
	switch (type) {
	case FilePutType::NoOverride:
		hFile = CreateFileW(wsfile.c_str(), GENERIC_WRITE, 0,
			NULL, CREATE_NEW, FILE_ATTRIBUTE_NORMAL, NULL);
		break;
	case FilePutType::Override:
		hFile = CreateFileW(wsfile.c_str(), GENERIC_WRITE, 0,
			NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
		break;
	case FilePutType::Append:
	case FilePutType::Insert:
		hFile = CreateFileW(wsfile.c_str(), GENERIC_WRITE, 0,
			NULL, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
		break;
	case FilePutType::Truncate:
		hFile = CreateFileW(wsfile.c_str(), GENERIC_WRITE, 0,
			NULL, TRUNCATE_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
		break;
	}
	if (!hFile || INVALID_HANDLE_VALUE == hFile) {
		if (file_exists(wsfile)) {
			resp->setStatusCode(k400BadRequest);
			resp->setBody("File already exists; if you want to override, use PATCH method.");
		}
		else {
			resp->setStatusCode(k500InternalServerError);
			resp->setBody("Failed to CreateFileW, error code " + to_string(GetLastError()));
		}
		return resp;
	}

	if (type == FilePutType::Append) {
		LARGE_INTEGER i{};
		i.QuadPart = 0;
		SetFilePointerEx(hFile, i, NULL, FILE_END);
	}
	if (type == FilePutType::Insert) {
		LARGE_INTEGER i{};
		i.QuadPart = offset;
		SetFilePointerEx(hFile, i, NULL, FILE_BEGIN);
	}

	const string_view& body = req->getBody();
	DWORD dw1 = 0, dw2 = 0;
	const char* pos = (const char*)(void*)body.data();
	bool hasSuccess = true;
	volatile size_t size = body.length() * sizeof(string_view::value_type), written = 0;
	constexpr size_t max_chunk_size = 65536;
	size_t chunk_size = (std::min)((size_t)size, (size_t)max_chunk_size);
	while (written < size) {
		dw1 = (DWORD)chunk_size;
		if (!WriteFile(hFile, pos, dw1, &dw2, NULL)) break;
		written += dw2;
		chunk_size = (std::min)((size_t)(size - written), (size_t)max_chunk_size);
		pos += written;
	}
	CloseHandle(hFile);

	if (hasSuccess) resp->setStatusCode(type == FilePutType::NoOverride ? k201Created : k204NoContent);
	else resp->setStatusCode(k500InternalServerError);
	return resp;
}

void server::FileServer::putFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const
{
	wstring wsfile; llvm::ConvertUTF8toWide(file, wsfile);
	return callback(PutFile(req, wsfile));
}

void server::FileServer::patchFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const
{
	wstring wsfile; llvm::ConvertUTF8toWide(file, wsfile);
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);

	string mode = req->getHeader("x-patch-mode");
	if (mode == "no-override") {
		return callback(PutFile(req, wsfile, FilePutType::NoOverride));
	}
	else if (mode == "override") {
		return callback(PutFile(req, wsfile, FilePutType::Override));
	}
	else if (mode == "append") {
		return callback(PutFile(req, wsfile, FilePutType::Append));
	}
	else if (mode == "trunc") {
		return callback(PutFile(req, wsfile, FilePutType::Truncate));
	}
	else if (mode == "insert") {
		ULONGLONG ull = (ULONGLONG)atoll(req->getHeader("x-patch-offset").c_str());
		if (ull) return callback(PutFile(req, wsfile, FilePutType::Insert, ull));
	}

	resp->setStatusCode(k400BadRequest); // TODO
	callback(resp);
}

void server::FileServer::delFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const
{
	wstring wsfile; llvm::ConvertUTF8toWide(file, wsfile);
	auto ftype = (IsFileOrDirectory(wsfile));
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	if (ftype != 1 && ftype != -1) {
		resp->setStatusCode(ftype == 0 ? k404NotFound : k500InternalServerError);
		return callback(resp);
	}
	else if (ftype == 1) {
		if (DeleteFileW(wsfile.c_str())) {
			resp->setStatusCode(k204NoContent);
			return callback(resp);
		}
		else {
			resp->setBody("Failed to DeleteFileW, error code " + to_string(GetLastError()));
			resp->setStatusCode(k500InternalServerError);
			return callback(resp);
		}
	}
	else {
		auto r = FileDeleteTreeW(wsfile);
		if (r == 0) {
			resp->setStatusCode(k200OK);
			resp->setBody("Directory deleted successfully");
			return callback(resp);
		}
		else if (r == 1) {
			resp->setStatusCode(k500InternalServerError);
			resp->setBody("tried to delete the directory, but something went wrong");
			return callback(resp);
		}
		else {
			resp->setStatusCode(k500InternalServerError);
			resp->setBody("failed");
			return callback(resp);
		}
	}
}


void server::FileServer::getFileList(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const
{
	wstring wsfile;
	llvm::ConvertUTF8toWide(file.c_str(), wsfile);
	wstring result;
	const auto err = [&req, &callback](HttpStatusCode status, string body = "") {
		HttpResponsePtr resp = HttpResponse::newHttpResponse();
		CORSadd(req, resp);
		resp->setStatusCode(status);
		resp->setContentTypeCode(CT_TEXT_PLAIN);
		resp->setBody(body);
		return callback(resp);
	};
	const auto errcode = [] {return to_string(GetLastError()); };
	auto fstat = IsFileOrDirectory(wsfile);
	if (fstat != -1) return (fstat == 0 ? err(k404NotFound, file + " not found") : (
		fstat == 1 ? err(k400BadRequest, "Cannot list files in a file") : err(k500InternalServerError)
		));

	{
		WIN32_FIND_DATA ffd{};
		LARGE_INTEGER filesize{};
		WCHAR szDir[1024]{};
		HANDLE hFind = INVALID_HANDLE_VALUE;
		DWORD dwError = 0;

		wcscpy_s(szDir, wsfile.c_str());
		wcscat_s(szDir, L"\\*");

		hFind = FindFirstFileW(szDir, &ffd);

		if (INVALID_HANDLE_VALUE == hFind) {
			return err(k500InternalServerError,
				"Failed to FindFirstFile, error: " + errcode());
		}

		do {
			if (ffd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) {
				//_tprintf(TEXT("  %s   <DIR>\n"), ffd.cFileName);
				result += (L"d|"s + ffd.cFileName) + L"\n";
			}
			else {
				filesize.LowPart = ffd.nFileSizeLow;
				filesize.HighPart = ffd.nFileSizeHigh;
				//_tprintf(TEXT("  %s   %ld bytes\n"), ffd.cFileName, filesize.QuadPart);
				result += (L"f|"s + ffd.cFileName) + L"\n";
			}
		} while (FindNextFileW(hFind, &ffd) != 0);

		dwError = GetLastError();
		if (dwError != ERROR_NO_MORE_FILES) {
			return err(k500InternalServerError, errcode());
		}

		FindClose(hFind);
	}

	//srand(time(0) % rand());
	//wstring szTemp = L".temp-RESPONSE-" + to_wstring(time(0)) + L"-" + to_wstring(rand()) + L".tmp";
	//HANDLE hTemp = CreateFileW(szTemp.c_str(), GENERIC_WRITE,
	//	0, 0, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, 0);
	//if (!hTemp) return err(k500InternalServerError, "Cannot create file");
	//DWORD dwTemp = 0;
	//WriteFile(hTemp, result.c_str(), DWORD((result.length() + 1) * sizeof(WCHAR)), &dwTemp, 0);
	//CloseHandle(hTemp);

	//HttpResponsePtr resp = HttpResponse::newFileResponse(ws2s(szTemp));
	//resp->setContentTypeString("text/plain; charset=utf-16");
	//CORSadd(req, resp);
	//callback(resp);

	//DeleteFileW(szTemp.c_str());

	//size_t len = (result.length() + 1) * sizeof(wchar_t);
	//UTF8* utf8 = (UTF8*)calloc(1, len);
	//UTF16* utf16 = (UTF16*)calloc(1, len);
	//if (!utf8 || !utf16) {
	//	if (utf8) free(utf8);
	//	if (utf16) free(utf16);
	//	return err(k500InternalServerError, "Cannot alloc memory");
	//}
	//memcpy_s(utf16, len, result.c_str(), len);
	//if (ConvertUTF16toUTF8((const UTF16**)&utf16, (UTF16*)((char*)(utf16)+len),
	//	&utf8, (UTF8*)((char*)(utf8)+len), strictConversion) != conversionOK) {
	//	free(utf8); free(utf16);
	//	return err(k500InternalServerError, "Cannot alloc memory");
	//}
	string utf8;
	if (!llvm::convertWideToUTF8(result, utf8)) {
		return err(k500InternalServerError, "Cannot convert wide to utf8");
	}
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setContentTypeCode(CT_TEXT_PLAIN);
	resp->setBody((utf8));
	callback(resp);

}

void server::FileServer::getVolumeList(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	wstring result1, result2;
	const auto err = [&req, &callback](HttpStatusCode status, string body = "") {
		HttpResponsePtr resp = HttpResponse::newHttpResponse();
		CORSadd(req, resp);
		resp->setStatusCode(status);
		resp->setContentTypeCode(CT_TEXT_PLAIN);
		resp->setBody(body);
		return callback(resp);
	};

	WCHAR buffer1[128]{}, buffer2[256]{}, buffer4[128]{}, buffer7[32]{};
	DWORD buffer3 = 0, buffer5 = 0, buffer6 = 0;
	HANDLE hFind = FindFirstVolumeW(buffer1, 128);
	if (INVALID_HANDLE_VALUE == hFind) return err(k500InternalServerError, "Failed to FindFirstVolumeW");

	do {
		result1 += (buffer1 + L"\n"s);

		if (!GetVolumePathNamesForVolumeNameW(buffer1, buffer2, 256, &buffer3)) continue;
		// 只需要驱动器路径 (其他的需求后面再加)
		if (!GetVolumeInformationW(buffer2, buffer4, 128, NULL, &buffer5, &buffer6, buffer7, 32)) continue;

		result2 += (buffer1 + L"|"s + buffer2 + L"|"s + buffer4 + L"|" + buffer7 + L"\n");

	} while (FindNextVolumeW(hFind, buffer1, 128));

	FindVolumeClose(hFind);

	string utf8; wstring result = result1 + L"\n" + result2;
	if (!llvm::convertWideToUTF8(result, utf8)) {
		return err(k500InternalServerError, "Cannot convert wide to utf8");
	}
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setContentTypeCode(CT_TEXT_PLAIN);
	resp->setBody(utf8);
	callback(resp);
}

void server::FileServer::isFileOrDirectory(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const
{
	wstring wsfile; llvm::ConvertUTF8toWide(file, wsfile);
	string r = to_string(IsFileOrDirectory(wsfile));
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setContentTypeCode(CT_TEXT_PLAIN);
	resp->setBody(r);
	callback(resp);
}

void server::FileServer::getFileInfo(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const
{
	const auto err = [&req, &callback](HttpStatusCode status, string body = "") {
		HttpResponsePtr resp = HttpResponse::newHttpResponse();
		CORSadd(req, resp);
		resp->setStatusCode(status);
		resp->setContentTypeCode(CT_TEXT_PLAIN);
		resp->setBody(body);
		return callback(resp);
	};

	Json::Value ret;
	wstring wsfile; llvm::ConvertUTF8toWide(file, wsfile);
	const auto fstat = IsFileOrDirectory(wsfile);
	if (fstat != -1 && fstat != 1) {
		return fstat == 0 ? err(k404NotFound, "Not Found") : err(k500InternalServerError);
	}

	string buf8; wstring buf16;

	ret["type"] = to_string(fstat);
	ret["size"] = to_string(MyGetFileSizeW(wsfile));
	ret["attrs"] = to_string(GetFileAttributesW(wsfile.c_str()));

	Json::Value time;
	if (HANDLE hFile = CreateFileW(wsfile.c_str(), GENERIC_READ,
		FILE_SHARE_READ, 0, OPEN_EXISTING, 0, 0)) {
		FILETIME c{}, a{}, w{};
		GetFileTime(hFile, &c, &a, &w);
		ULARGE_INTEGER uc{}, ua{}, uw{};
		uc.LowPart = c.dwLowDateTime, uc.HighPart = c.dwHighDateTime;
		ua.LowPart = a.dwLowDateTime, ua.HighPart = a.dwHighDateTime;
		uw.LowPart = w.dwLowDateTime, uw.HighPart = w.dwHighDateTime;
		time["creation"] = uc.QuadPart;
		time["access"] = ua.QuadPart;
		time["write"] = uw.QuadPart;
	}
	ret["time"] = time;

	ret["success"] = true;
	HttpResponsePtr resp = HttpResponse::newHttpJsonResponse(ret);
	CORSadd(req, resp);
	callback(resp);
}

bool static sys_copy_or_move(std::wstring& src, std::wstring& dest, int type) {
	auto srcType = IsFileOrDirectory(src);

	if (type == 1)
		return srcType == -1 ?
		CopyFileTreeW(src.c_str(), dest.c_str(), true) == 0 :
		CopyFileW(src.c_str(), dest.c_str(), true);

	if (type == 2) return MoveFileExW(src.c_str(), dest.c_str(),
		MOVEFILE_COPY_ALLOWED | MOVEFILE_WRITE_THROUGH);

	if (type == 3) return CreateSymbolicLinkW(dest.c_str(), src.c_str(),
		srcType == 1 ? 0x0 : SYMBOLIC_LINK_FLAG_DIRECTORY);

	return false;
}
HttpResponsePtr static sys_func(const HttpRequestPtr& req, const string& src, const string& dest, int type) {
	wstring wsrc, wdest;
	llvm::ConvertUTF8toWide(src, wsrc); llvm::ConvertUTF8toWide(dest, wdest);

	string r = ""; auto code = k200OK;
	if (!sys_copy_or_move(wsrc, wdest, type)) {
		auto err = GetLastError();
		if (err == ERROR_FILE_NOT_FOUND) {
			r = "File not found"; code = k404NotFound;
		}
		else {
			r = "Failed, code=" + to_string(err); code = k500InternalServerError;
		}
	}

	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setStatusCode(code);
	resp->setContentTypeCode(CT_TEXT_PLAIN);
	resp->setBody(r);
	return(resp);
}
void server::FileServer::sys_copy(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& src, std::string&& dest) const
{
	callback(sys_func(req, src, dest, 1));
}
void server::FileServer::sys_move(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& src, std::string&& dest) const
{
	callback(sys_func(req, src, dest, 2));
}
void server::FileServer::sys_link(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& src, std::string&& dest) const
{
	callback(sys_func(req, src, dest, 3));
}


void server::FileServer::newDir(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const
{
	string_view body = req->getBody();
	wstring wsname;
	llvm::ConvertUTF8toWide(body.data(), wsname);

	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setContentTypeCode(CT_TEXT_PLAIN);
	if (!CreateDirectoryW(wsname.c_str(), NULL)) {
		resp->setStatusCode(k500InternalServerError);
		resp->setBody("Failed, code=" + to_string(GetLastError()));
	}
	callback(resp);
}





