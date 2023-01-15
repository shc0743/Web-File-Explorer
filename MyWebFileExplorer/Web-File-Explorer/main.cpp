#include <drogon/drogon.h>
#include <Windows.h>
#include <VersionHelpers.h>
#include <cstdio>
#include "../../resource/tool.h"

#include "server.h"
#include "ui.h"



HINSTANCE hInst;


void InitAuthTokenVerify(CmdLineW& cl);




#pragma comment(linker,"\"/manifestdependency:type='win32' \
name='Microsoft.Windows.Common-Controls' version='6.0.0.0' \
processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'\"")


// wWinMain function: The application will start from here.
int APIENTRY wWinMain(_In_ HINSTANCE hInstance,
	_In_opt_ HINSTANCE hPrevInstance,
	_In_ LPWSTR    lpCmdLine,
	_In_ int       nCmdShow)
{
	UNREFERENCED_PARAMETER(hInstance);
	UNREFERENCED_PARAMETER(hPrevInstance);
	UNREFERENCED_PARAMETER(lpCmdLine);
	UNREFERENCED_PARAMETER(nCmdShow);

	// TODO: Place code here.
	UNREFERENCED_PARAMETER(0);
	using namespace std;

	if (!IsWindowsVistaOrGreater()) {
		fprintf(stderr, "[FATAL] Your OS is TOO LOW!\nIf you want to run this "
			"program, please update your OS.\nAt least Windows Vista is required.\n"
			"Exiting...\n");
		return ERROR_NOT_SUPPORTED; // Exit
	}


	::hInst = hInstance;


	CmdLineW cl(GetCommandLineW());
	wstring type;
	cl.getopt(L"type", type);


	if (type == L"server") {
		bool allow_global_access = (cl.getopt(L"allow-global-access") != 0);
		wstring sPort; unsigned short port = 0;
		cl.getopt(L"port", sPort);
		port = (unsigned short)atoi(ws2c(sPort));
		if (!port) return ERROR_INVALID_PARAMETER;

		std::wstring root = GetProgramDirW() + L".data";
		(cl.getopt(L"root-path", root));
		if (-1 != IsFileOrDirectory(root)) {
			if (!CreateDirectoryW(root.c_str(), NULL)) {
				return GetLastError();
			}
			SetFileAttributesW(root.c_str(), FILE_ATTRIBUTE_HIDDEN);
		}
		std::wstring webroot = root + L"\\webroot";
		(cl.getopt(L"webroot", webroot));
		if (-1 != IsFileOrDirectory(webroot)) {
			if (!CreateDirectoryW(webroot.c_str(), NULL)) {
				return GetLastError();
			}
		}


		InitAuthTokenVerify(cl);


		std::shared_ptr<server::FileServer> srv(new server::FileServer);
		auto& app = drogon::app();
		app.setLogPath("./")
			.setLogLevel(trantor::Logger::kDebug)
			.setDocumentRoot(ws2s(webroot))
			.setUploadPath(ws2s(root + L"\\uploads"))
			.setThreadNum(8)
			.registerController(srv)
			.addListener(allow_global_access ? "0.0.0.0" : "127.0.0.1", port);
		app.run();

		return 0;
	}

	if (type == L"ui") {
		return UIEntry(cl);
	}

	
	if (cl.argc() < 2) {
		return Process.StartAndWait(L"\"" + GetProgramDirW() + L"\" --type=ui ");
	}

	return ERROR_INVALID_PARAMETER;
	return 0;
}



