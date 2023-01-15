#include "server.h"
#include <string>
#include "../../resource/tool.h"

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
		memcpy(pAddr, &len, sizeof(len));
		size_t* szStartAddr = ((size_t*)pAddr) + 1;
		memcpy(szStartAddr, p, len);

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

void server::FileServer::downloadFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file, std::string&& tok) const
{
	// TODO

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
	wstring result;
	const auto err = [&req, &callback](HttpStatusCode status, string body = "") {
		HttpResponsePtr resp = HttpResponse::newHttpResponse();
		CORSadd(req, resp);
		resp->setStatusCode(status);
		resp->setContentTypeCode(CT_TEXT_PLAIN);
		resp->setBody(body);
		return callback(resp);
	};
	auto fstat = IsFileOrDirectory(file);
	if (fstat != -1) return err(fstat == 1 ? k400BadRequest : k404NotFound);

	{
		WIN32_FIND_DATA ffd{};
		LARGE_INTEGER filesize{};
		WCHAR szDir[1024]{};
		HANDLE hFind = INVALID_HANDLE_VALUE;
		DWORD dwError = 0;

		wstring wsFile = s2ws(file);
		wcscpy_s(szDir, wsFile.c_str());
		wcscat_s(szDir, L"\\*");

		hFind = FindFirstFileW(szDir, &ffd);

		if (INVALID_HANDLE_VALUE == hFind) {
			return err(k500InternalServerError,
				"Failed to FindFirstFile, error: " + LastErrorStrA());
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
			return err(k500InternalServerError, LastErrorStrA());
		}

		FindClose(hFind);
	}

	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setBody(ws2s(result));
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

	HttpResponsePtr resp = HttpResponse::newHttpResponse();
	CORSadd(req, resp);
	resp->setBody(ws2s(result1 + L"\n" + result2));
	callback(resp);
}





