#include "ui.h"
#include <Uxtheme.h>
#include "resource.h"


extern HINSTANCE hInst;


static DWORD InitUIClass(HINSTANCE hInst);

static LRESULT CALLBACK WndProc_Main(HWND hwnd, UINT message, WPARAM wParam, LPARAM lParam);
static LRESULT CALLBACK WndProc_CreditEdit(HWND hwnd, UINT message, WPARAM wParam, LPARAM lParam);

static WCHAR gwClassApp[256], gwClassCredit[256];
static HFONT hFontDefault;
static std::wstring tmp_token;
static constexpr UINT WM_CHECKAUTHTOKEN = WM_USER + 0x100cA;

static bool hasPendingOperation;
static HANDLE hEventCoreWorker;
static std::deque<unsigned long long> nCoreWorkerCode;

static HANDLE hServerProcess;
static std::wstring sInstanceDir;


static DWORD CALLBACK Thread_CoreWorker(PVOID data);




int __stdcall UIEntry(CmdLineW& cl) {
	SetCurrentDirectoryW(GetProgramPathW().c_str());

	if (DWORD ret = InitUIClass(hInst)) return ret;

	WCHAR appTitle[256]{};
	if (!LoadStringW(hInst, IDS_STRING_UI_TITLE_MAIN, appTitle, 256)) return GetLastError();

	if (HWND hwnd = FindWindowW(gwClassApp, NULL)) {
		if (!cl.getopt(L"new-instance")) {
			ShowWindow(hwnd, SW_RESTORE);
			SetForegroundWindow(hwnd);
			return ~int(STILL_ACTIVE);
		}
	}

	cl.getopt(L"instance-dir", sInstanceDir);
	if (sInstanceDir.empty()) {
		sInstanceDir = GetProgramDirW() + L".data";
		if (-1 != IsFileOrDirectory(sInstanceDir)) {
			if (!CreateDirectoryW(sInstanceDir.c_str(), NULL)) {
				return GetLastError();
			}
			SetFileAttributesW(sInstanceDir.c_str(), FILE_ATTRIBUTE_HIDDEN);
		}
	}

	HANDLE hLockFile = NULL;
	{
		DWORD pid = GetCurrentProcessId(), temp = 0;
		hLockFile = CreateFileW((sInstanceDir + L"/.lockfile").c_str(), FILE_READ_DATA,
			FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL , NULL);
		if (hLockFile != INVALID_HANDLE_VALUE) {
			DWORD targetPID = 0;
			if (ReadFile(hLockFile, &targetPID, sizeof(DWORD), &temp, NULL)) {
				if (targetPID != pid && !cl.getopt(L"force")) {
					HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, targetPID);
					if (hProcess && (MessageBoxW(NULL,
						L"A instance in the directory is still running.\n"
						"If you run a new instance in the same directory, "
						"it may cause unpredictable consequences.\n"
						"If you want to run a new instance without conflict, "
						"please use --instance-dir command-line option.\n"
						"\nStill continue?", L"Instance Conflict",
						MB_ICONQUESTION | MB_OKCANCEL | MB_DEFBUTTON2) != IDOK)) {
						CloseHandle(hProcess);
						CloseHandle(hLockFile);
						return ERROR_ALREADY_EXISTS;
					}
					if (hProcess) CloseHandle(hProcess);
				}
			}
			CloseHandle(hLockFile);
		}
		hLockFile = CreateFileW((sInstanceDir + L"/.lockfile").c_str(),
			GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ, NULL,
			CREATE_ALWAYS, 0, NULL);
		if (hLockFile) {
			WriteFile(hLockFile, &pid, sizeof(DWORD), &temp, NULL);
			FlushFileBuffers(hLockFile);
		}
		if (hLockFile) CloseHandle(hLockFile);
	}

	HWND hwnd = CreateWindowExW(0, gwClassApp, appTitle, WS_OVERLAPPEDWINDOW,
		0, 0, 640, 480, 0, 0, 0, 0);
	if (!hwnd) return GetLastError();

	CenterWindow(hwnd);
	if (!cl.getopt(L"silent")) ShowWindow(hwnd, SW_NORMAL);

	if (HANDLE hThread = CreateThread(0, 0, Thread_CoreWorker, hwnd, CREATE_SUSPENDED, 0)) {
		ResumeThread(hThread);
		CloseHandle(hThread);
	} else {
		MessageBoxW(NULL, LastErrorStrW().c_str(), NULL, MB_ICONHAND);
		return GetLastError();
	}


	HACCEL hAcc = LoadAccelerators(hInst, MAKEINTRESOURCE(IDR_ACCELERATOR_MAINAPP));

	MSG msg{};
	while (GetMessageW(&msg, 0, 0, 0)) {
		if (!TranslateAccelerator(msg.hwnd, hAcc, &msg)) {
			TranslateMessage(&msg);
			DispatchMessageW(&msg);
		}
	}
	DeleteFileW((sInstanceDir + L"/.lockfile").c_str());
	return (int)msg.wParam;
	return 0;
}


static DWORD InitUIClass(HINSTANCE hInst) {
	hFontDefault = CreateFontW(-14, -7, 0, 0, FW_NORMAL, 0, 0, 0, DEFAULT_CHARSET,
		OUT_CHARACTER_PRECIS, CLIP_CHARACTER_PRECIS, DEFAULT_QUALITY, FF_DONTCARE,
		L"Consolas");

	INITCOMMONCONTROLSEX icce{};
	icce.dwSize = sizeof icce;
	icce.dwICC = ICC_ALL_CLASSES;
	if (!InitCommonControlsEx(&icce)) return GetLastError();

	if (!LoadStringW(hInst, IDS_STRING_UI_CLASS_MAIN, gwClassApp, 256)) return GetLastError();
	if (!LoadStringW(hInst, IDS_STRING_UI_CLASS_CREDIT, gwClassCredit, 256)) return GetLastError();

	if (!s7::MyRegisterClassW(gwClassApp, WndProc_Main, {
		.hInstance = hInst,
		.hbrBackground = CreateSolidBrush(RGB(255,255,255)),
		.lpszMenuName = MAKEINTRESOURCE(IDR_MENU_MAINAPP),
	})) return GetLastError();
	if (!s7::MyRegisterClassW(gwClassCredit, WndProc_CreditEdit, {
		.hInstance = hInst,
		.hCursor = LoadCursor(NULL, IDC_CROSS),
		.hbrBackground = CreateSolidBrush(RGB(0xF0,0xF0,0xF0)),
		.lpszMenuName = MAKEINTRESOURCE(IDR_MENU_MAINAPP),
	})) return GetLastError();

	return 0;
}




struct WndData_Main
{
	HWND
		tServerStatus,
		bToggleServer,
		Split1,
		cAllowGlobAccess,
		tServerPort,
		eServerPort,
		tServerAddr,
		eServerAddr,
		bServerAddr,
		bCopySaddr,
		Split2,
		bApp,
		Split3,
		wCreditEdit;
};
struct WndData_CreditEdit
{
	HWND
		eAddText{},
		bAdd{}, bDelete{}, bClear{},
		List{};
	std::vector<std::wstring> credits;
};


inline void NotifyCoreWorker(unsigned long long code) {
	::nCoreWorkerCode.push_back(code);
	SetEvent(::hEventCoreWorker);
}
DWORD Thread_CoreWorker(PVOID dd) {
	HWND hwnd = (HWND)dd;
	if (!IsWindow(hwnd)) return ERROR_NOT_FOUND;

	WndData_Main* data = (WndData_Main*)GetWindowLongPtr(hwnd, GWLP_USERDATA);
	const auto enable = [data] (BOOL bEnable) {
		EnableWindow(data->bToggleServer, bEnable);
		EnableWindow(data->cAllowGlobAccess, bEnable);
		EnableWindow(data->eServerPort, bEnable);
		EnableWindow(data->bApp, bEnable);
	};

	srand(unsigned int(time(0) % rand()));
	Sleep(rand() % 900 + 100);

	SetWindowTextW(data->tServerStatus, L"stopped");
	enable(TRUE);

	::hEventCoreWorker = CreateEvent(NULL, FALSE, FALSE, NULL);
	if (!hEventCoreWorker) return GetLastError();
	unsigned long long code = 0;
	do {
		WaitForSingleObject(hEventCoreWorker, INFINITE);

		while (nCoreWorkerCode.size() > 0) {
			code = ::nCoreWorkerCode[0];
			::nCoreWorkerCode.pop_front();
			if (code == WM_QUIT) break;

			switch (code)
			{

			case 0x10001: {
				if (::hServerProcess) {
					SetWindowTextW(data->bToggleServer, L"Stopping Server");
					auto k32 = GetModuleHandle(TEXT("kernel32.dll"));
					if (!k32) {
						SetWindowTextW(data->bToggleServer, L"Stop Server");
						break;
					}
					auto f = (LPTHREAD_START_ROUTINE)GetProcAddress(k32, "ExitProcess");
#pragma warning(push)
#pragma warning(disable: 6001)
					HANDLE hRemote = CreateRemoteThread(::hServerProcess, 0, 0, f, 0, 0, 0);
					if (hRemote) CloseHandle(hRemote);
					else {
						MessageBoxW(hwnd, LastErrorStrW().c_str(), L"Cannot Stop Server", MB_ICONHAND);
						EnableWindow(data->bToggleServer, TRUE);
						SetWindowTextW(data->bToggleServer, L"Stop Server");
					}
#pragma warning(pop)
					break;
				}

				enable(FALSE);

				WCHAR port[7]{};
				GetWindowTextW(data->eServerPort, port, 7);
				std::wstring cl = L"\"" + GetProgramDirW() + L"\" --type=server --port=\"" + port + L"\" ";
				if (SendMessage(data->cAllowGlobAccess, BM_GETSTATE, 0, 0) & BST_CHECKED) {
					cl += L"--allow-global-access ";
				}
				cl += L"--token=Window;" + std::to_wstring((LONG_PTR)hwnd) +
					L";" + std::to_wstring((int)WM_CHECKAUTHTOKEN) + L" ";
				auto pi = Process.Start_Suspended(cl);
				if (!pi.hProcess) {
					MessageBoxW(hwnd, LastErrorStrW().c_str(), NULL, MB_ICONERROR);
					enable(TRUE);
					EnableWindow(data->bServerAddr, FALSE);
					break;
				}
				::hServerProcess = pi.hProcess;

				HANDLE hThread = NULL;
				const auto lambda1 = [](PVOID d) -> DWORD {
					DWORD c = 0;
					WaitForSingleObject(d, INFINITE);
					GetExitCodeProcess(d, &c);

					NotifyCoreWorker(0x10002);
					return 0;
				};
				hThread = CreateThread(0, 0, lambda1, pi.hProcess, 0, 0);
#pragma warning(push)
#pragma warning(disable: 6001)
				if (hThread) CloseHandle(hThread);
#pragma warning(pop)

				std::wstring srv_addr = L"http://127.0.0.1:"; srv_addr += port;
				SetWindowTextW(data->eServerAddr, srv_addr.c_str());

				SetWindowTextW(data->tServerStatus, L"running");
				SetWindowTextW(data->bToggleServer, L"Stop Server");
				EnableWindow(data->bToggleServer, TRUE);
				EnableWindow(data->bServerAddr, TRUE);

				ResumeThread(pi.hThread);
				CloseHandle(pi.hThread);
			}
				break;

			case 0x10002: {
				::hServerProcess = NULL;
				SetWindowTextW(data->tServerStatus, L"stopped");
				SetWindowTextW(data->bToggleServer, L"Start Server");
				SetWindowTextW(data->eServerAddr, L"N/A");
				enable(TRUE);
				EnableWindow(data->bServerAddr, FALSE);
			}
				break;


			default:;
			}
		}
	} while (code != WM_QUIT);

	return 0;
}



static LRESULT WndProc_CommandHandler_Main(HWND hwnd, WPARAM wParam, LPARAM lParam, WndData_Main* data);
LRESULT WndProc_Main(HWND hwnd, UINT message, WPARAM wParam, LPARAM lParam) {
	WndData_Main* data = (WndData_Main*)GetWindowLongPtr(hwnd, GWLP_USERDATA);
	switch (message)
	{
	case WM_CREATE: {
		SetWindowLongPtr(hwnd, GWL_EXSTYLE, GetWindowLongPtr(hwnd, GWL_EXSTYLE) | WS_EX_LAYERED);
		SetLayeredWindowAttributes(hwnd, NULL, 0xF0, LWA_ALPHA);

		DragAcceptFiles(hwnd, TRUE);

		WndData_Main* data = new(WndData_Main);
		SetWindowLongPtr(hwnd, GWLP_USERDATA, (LONG_PTR)data);

#define MYCTLS_VAR_HWND hwnd
#define MYCTLS_VAR_HINST hInst
#define MYCTLS_VAR_HFONT hFontDefault
#include "ctls.h"

		text(L"Server status:", 10, 10, 100, 20, SS_CENTERIMAGE);
		data->tServerStatus = text(L"unknown", 0, 0, 1, 1, SS_CENTERIMAGE);
		data->bToggleServer = button(L"Start Server", 1, 0, 0, 1, 1, WS_DISABLED);
		data->Split1 = text(L"", 0, 0, 1, 1, WS_BORDER);
		data->cAllowGlobAccess =
			button(L"Allow Global Access", 0, 0, 0, 1, 1, WS_DISABLED | BS_AUTOCHECKBOX);
		data->tServerPort = text(L"Server Port:", 0, 0, 1, 1, SS_CENTERIMAGE);
		data->eServerPort = edit(L"48720", 0, 0, 1, 1, WS_DISABLED | ES_NUMBER);
		data->tServerAddr = text(L"Server Address:", 0, 0, 1, 1, SS_CENTERIMAGE);
		data->eServerAddr = edit(L"N/A (server not active)", 0, 0, 1, 1, ES_READONLY);
		data->bCopySaddr = button(L"Copy", 2);
		data->bServerAddr = button(L"Open", 3, 0, 0, 1, 1, WS_DISABLED);
		data->Split2 = text(L"", 0, 0, 1, 1, WS_BORDER);
		data->bApp = button(L"Application...", 4, 0, 0, 1, 1, WS_DISABLED);
		data->Split3 = text(L"", 0, 0, 1, 1, WS_BORDER);
		data->wCreditEdit = custom(L"", gwClassCredit, 0, 0, 1, 1, WS_BORDER);



#undef MYCTLS_VAR_HFONT
#undef MYCTLS_VAR_HINST
#undef MYCTLS_VAR_HWND
	}
		break;

	case WM_SIZING:
	case WM_SIZE:
	{
		RECT rc{}; GetClientRect(hwnd, &rc);
		SIZE sz{ .cx = rc.right - rc.left,.cy = rc.bottom - rc.top };

		SetWindowPos(data->tServerStatus,	0,	120, 10, sz.cx -20 -110, 20, 0);
		SetWindowPos(data->bToggleServer,	0,	10, 40, sz.cx -20, 40, 0);
		SetWindowPos(data->Split1,			0,	10, 90, sz.cx -20, 1, 0);
		SetWindowPos(data->cAllowGlobAccess,0,	10, 100, 160, 20, 0);
		SetWindowPos(data->tServerPort,		0,	180, 100, 90, 20, 0);
		SetWindowPos(data->eServerPort,		0,	280, 100, sz.cx -290, 20, 0);
		SetWindowPos(data->tServerAddr,		0,	10, 130, 110, 20, 0);
		SetWindowPos(data->eServerAddr,		0,	130, 130, sz.cx -280, 20, 0);
		SetWindowPos(data->bCopySaddr,		0,	sz.cx -140, 130, 60, 20, 0);
		SetWindowPos(data->bServerAddr,		0,	sz.cx -70, 130, 60, 20, 0);
		SetWindowPos(data->Split2,			0,	10, 160, sz.cx -20, 1, 0);
		SetWindowPos(data->bApp,			0,	10, 170, sz.cx -20, 30, 0);
		SetWindowPos(data->Split3,			0,	10, 210, sz.cx -20, 1, 0);
		SetWindowPos(data->wCreditEdit,		0,	10, 220, sz.cx -20, sz.cy -230, 0);

	}
		break;

	case WM_COMMAND:
		return WndProc_CommandHandler_Main(hwnd, wParam, lParam, data);
		break;

	case WM_CHECKAUTHTOKEN:
	{
		PVOID pAddr = (PVOID)(LONG_PTR)lParam;
		DWORD pid = (DWORD)wParam;
		size_t sMem = 0; size_t nReaded = 0;
		HANDLE hProcess = OpenProcess(PROCESS_VM_READ, FALSE, pid);
		if (!hProcess) return 0;
		if (!ReadProcessMemory(hProcess, pAddr, &sMem, sizeof(size_t), &nReaded)) {
			CloseHandle(hProcess);
			return 0;
		}
		if (sMem == 0 || sMem > 8192) return ERROR_OUTOFMEMORY;
		PWSTR pBuffer = (PWSTR)VirtualAlloc(NULL, sMem, MEM_COMMIT, PAGE_READWRITE);
		if (!pBuffer) {
			CloseHandle(hProcess);
			return 0;
		}
		if (!ReadProcessMemory(hProcess, (((size_t*)(pAddr)) + 1), pBuffer, sMem, &nReaded)) {
			VirtualFree(pBuffer, 0, MEM_RELEASE);
			CloseHandle(hProcess);
			return 0;
		}
		// pBuffer 即为需要验证的token
		bool bSuccess = false;
		{
			// 调用验证

			if (SendMessage(data->wCreditEdit, WM_CHECKAUTHTOKEN,
				0, (LPARAM)(LONG_PTR)pBuffer) == 0x100000CC
			) bSuccess = true;
		}

		VirtualFree(pBuffer, 0, MEM_RELEASE);
		CloseHandle(hProcess); // 一定要记得关句柄啊... (-- 来自句柄泄露导致卡死的作者)
		// 验证成功
		if (bSuccess) return 0x1006F0AC/*随便乱打的数(meaningless)*/;
		// 验证失败，返回默认值(0)
	}
		break;

	case WM_CLOSE:
		if (hasPendingOperation) {
			MessageBoxTimeoutW(hwnd, L"Pending operation detected", NULL, MB_ICONERROR, 0, 1000);
			return FALSE;
		}
		if (::hServerProcess) {
			MessageBoxTimeoutW(hwnd, L"Server is still running", NULL, MB_ICONERROR, 0, 1000);
			return FALSE;
		}
		SetWindowLongPtr(hwnd, GWL_EXSTYLE, GetWindowLongPtr(hwnd, GWL_EXSTYLE) & ~WS_EX_LAYERED);
		DestroyWindow(hwnd);
		break;

	case WM_DESTROY:
		NotifyCoreWorker(WM_QUIT);
		if (data) delete data;
		PostQuitMessage(0);
		break;

	default: return DefWindowProc(hwnd, message, wParam, lParam);
	}
	return 0;
}
LRESULT WndProc_CommandHandler_Main(HWND hwnd, WPARAM wParam, LPARAM lParam, WndData_Main* data) {
	int wmId = LOWORD(wParam);
	switch (wmId)
	{
	case ID_MENU_FILE_CLOSE:
		SendMessage(hwnd, WM_CLOSE, 0, 0);
		break;

	case ID_MENU_FILE_EXIT:

		break;

	case 1:
		EnableWindow(data->bToggleServer, FALSE);
		NotifyCoreWorker(0x10001);
		break;

	case 2:
	case 3:
	{
		WCHAR buffer[256]{};
		if (wmId == 2) {
			GetWindowTextW(data->eServerAddr, buffer, 256);
			auto mb = MessageBoxTimeoutW;
			return (CopyText(buffer) == 0) ?
				mb(hwnd, L"Copied", L"Success", MB_ICONINFORMATION, 0, 500) :
				mb(hwnd, L"Failed to copy", NULL, MB_ICONERROR, 0, 500);
		}
		if (!file_exists(sInstanceDir + L"/webroot/.webroot")) {
			int result = 0;
			TaskDialog(hwnd, NULL, L"Resource Download", L"Download resource?",
				L"The Web Experience Pack is missing or broken.\n\n"
				L"Without the package, you can't use the web GUI, "
				"but the Application Program Interface is available.\n"
				"To use the web GUI, you can download the Web Experience Pack online.\n\n"
				L"Do you want to download the resource now?",
				TDCBF_YES_BUTTON | TDCBF_CANCEL_BUTTON, TD_INFORMATION_ICON, &result);
			if (result == IDYES) {
				if (!LoadStringW(hInst, IDS_STRING_WEBEXPACK_DOWNLOAD, buffer, 256)) {
					TaskDialog(hwnd, NULL, L"Unable to Download Resource",
						L"Unable to download resource, maybe the executable file is corrupted",
						LastErrorStrW().c_str(), TDCBF_CANCEL_BUTTON, TD_ERROR_ICON, 0);
				}
				else {
					ShellExecuteW(NULL, L"open", buffer, NULL, NULL, SW_NORMAL);
					break;
				}
			}
		}
		GetWindowTextW(data->eServerAddr, buffer, 256);
		ShellExecuteW(NULL, L"open", buffer, NULL, NULL, SW_NORMAL);
	}
		break;

	case 4:
	{
		HMENU hMenu = GetMenu(hwnd);
		if (!hMenu) break;
		RECT rc{}; GetWindowRect(data->bApp, &rc);
		TrackPopupMenu(hMenu, TPM_RIGHTBUTTON, rc.left, rc.bottom, 0, hwnd, NULL);
	}
		break;

	default: return DefWindowProc(hwnd, WM_COMMAND, wParam, lParam);
	}
	return 0;
}



LRESULT WndProc_CreditEdit(HWND hwnd, UINT message, WPARAM wParam, LPARAM lParam) {
	WndData_CreditEdit* data = (WndData_CreditEdit*)GetWindowLongPtr(hwnd, GWLP_USERDATA);
	switch (message)
	{
	case WM_CREATE: {
		WndData_CreditEdit* data = new(WndData_CreditEdit);
		SetWindowLongPtr(hwnd, GWLP_USERDATA, (LONG_PTR)data);

#define MYCTLS_VAR_HWND hwnd
#define MYCTLS_VAR_HINST hInst
#define MYCTLS_VAR_HFONT hFontDefault
#include "ctls.h"

		text(L"Credentials Editor", 10, 10, 130, 20, SS_CENTERIMAGE | WS_BORDER);

		text(L"Add Password:", 10, 40, 100, 30, SS_CENTERIMAGE);
		data->eAddText = edit(L"", 0, 0, 1, 1, ES_PASSWORD);
		SendMessage(data->eAddText, EM_SETPASSWORDCHAR, 42, 0);
		data->bAdd = button(L"Add", 1);
		data->bDelete = button(L"Delete", 2);
		data->bClear = button(L"Clear", 3);

		data->List = custom(L"", WC_LISTVIEWW, 0, 0, 1, 1, LVS_REPORT | LVS_SINGLESEL | WS_BORDER);
		SetWindowTheme(data->List, L"Explorer", NULL);
		WCHAR wcBuffer[] = L"Password";
		LVCOLUMNW lvcol{};
		lvcol.mask = LVCF_FMT | LVCF_WIDTH | LVCF_TEXT | LVCF_SUBITEM;
		lvcol.iSubItem = 0;
		lvcol.pszText = wcBuffer;
		lvcol.fmt = LVCFMT_LEFT;
		lvcol.cx = 400;
		ListView_InsertColumn(data->List, 0, &lvcol);


#undef MYCTLS_VAR_HFONT
#undef MYCTLS_VAR_HINST
#undef MYCTLS_VAR_HWND
	}
				  break;

	case WM_SIZING:
	case WM_SIZE:
	{
		RECT rc{}; GetClientRect(hwnd, &rc);
		SIZE sz{ .cx = rc.right - rc.left,.cy = rc.bottom - rc.top };

		SetWindowPos(data->eAddText, 0, 110, 40, sz.cx -330, 30, 0);
		SetWindowPos(data->bAdd, 0, sz.cx -210, 40, 60, 30, 0);
		SetWindowPos(data->bDelete, 0, sz.cx -140, 40, 60, 30, 0);
		SetWindowPos(data->bClear, 0, sz.cx -70, 40, 60, 30, 0);
		SetWindowPos(data->List, 0, 10, 80, sz.cx -20, sz.cy -90, 0);

	}
	break;

	case WM_USER+1:
	{
		ListView_DeleteAllItems(data->List);

		LVITEMW lvI{};

		// Initialize LVITEM members that are common to all items.
		lvI.mask = LVIF_TEXT | LVIF_STATE;
		lvI.stateMask = 0;
		lvI.iSubItem = 0;
		lvI.state = 0;

		for (size_t i = 0; i < data->credits.size(); ++i) {
			// Initialize LVITEM members that are different for each item.
			lvI.iItem = int(i);
			lvI.pszText = (LPWSTR)data->credits[i].c_str();

			// Insert items into the list.
			if (ListView_InsertItem(data->List, &lvI) == -1)
				return FALSE;
		}
	}
		break;

	case WM_CHECKAUTHTOKEN: {
		WCHAR* ptr = (WCHAR*)(LONG_PTR)lParam;
		for (auto& i : data->credits) {
			if (i == ptr) return 0x100000CC;
		}
	}
		break;

	case WM_COMMAND:
		switch (LOWORD(wParam)) {
		case 1: {
			WCHAR buffer[2048]{};
			SendMessage(data->eAddText, WM_GETTEXT, 2048, (LPARAM)buffer);
			if (!buffer[0]) break;
			data->credits.push_back(buffer);
			buffer[0] = 0;
			SendMessage(data->eAddText, WM_SETTEXT, 0, (LPARAM)buffer);
			SendMessage(hwnd, WM_USER + 1, 0, 0);
		}
			break;
		case 2: {
			int selection = ListView_GetSelectionMark(data->List);
			if (selection < 0) break;
			data->credits.erase(data->credits.begin() + selection);
			SendMessage(hwnd, WM_USER + 1, 0, 0);
		}
			break;
		case 3:
			data->credits.clear();
			SendMessage(hwnd, WM_USER + 1, 0, 0);
			break;

		default:
			return DefWindowProc(hwnd, message, wParam, lParam);
		}
		break;

	case WM_CLOSE:
		SetWindowLongPtr(hwnd, GWL_EXSTYLE, GetWindowLongPtr(hwnd, GWL_EXSTYLE) & ~WS_EX_LAYERED);
		DestroyWindow(hwnd);
		break;

	case WM_DESTROY:
		if (data) delete data;
		PostQuitMessage(0);
		break;

	default: return DefWindowProc(hwnd, message, wParam, lParam);
	}
	return 0;
}









