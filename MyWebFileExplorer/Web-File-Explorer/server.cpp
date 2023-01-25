#include "server.h"
#include <string>
#include "../../resource/tool.h"
#include "../includes/ConvertUTF.h"

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

void server::FileServer::downloadFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file, std::string&& tok, std::string&& attachment) const
{
	if (!VerifyAuthToken(tok)) {
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

	HttpResponsePtr resp = HttpResponse::newFileResponse(file, attachment);
	CORSadd(req, resp);
	callback(resp);
}

void server::FileServer::getFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const
{
	auto fstat = IsFileOrDirectory(file);
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

void server::FileServer::putFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const
{
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setBody("");
	callback(resp);

}

void server::FileServer::patchFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const
{
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setBody("");
	callback(resp);

}

void server::FileServer::delFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const
{
	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setBody("");
	callback(resp);

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

	ret["success"] = true;
	HttpResponsePtr resp = HttpResponse::newHttpJsonResponse(ret);
	CORSadd(req, resp);
	callback(resp);
}





