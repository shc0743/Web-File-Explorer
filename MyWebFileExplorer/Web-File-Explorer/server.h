#pragma once
#include <drogon/drogon.h>
#include <Windows.h>


#define CORSadd(req, resp) {\
	resp->addHeader("access-control-allow-origin", req->getHeader("origin"));\
	resp->addHeader("access-control-allow-methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");\
	resp->addHeader("access-control-allow-headers", req->getHeader("access-control-request-headers"));\
	resp->addHeader("access-control-allow-credentials", "true");\
	resp->addHeader("access-control-max-age", "300");\
}


namespace server {
	using namespace drogon;

	class AuthFilter :public drogon::HttpFilter<AuthFilter>
	{
	public:
		virtual void doFilter(const HttpRequestPtr& req,
			FilterCallback&& fcb,
			FilterChainCallback&& fccb) override;
	};

	class FileServer : public drogon::HttpController<FileServer>
	{
	public:
		METHOD_LIST_BEGIN
			ADD_METHOD_TO(server::FileServer::auth, "/auth", Post, Options, "server::AuthFilter");

			ADD_METHOD_TO(server::FileServer::downloadFile, "/dl?f={}&t={}&a={}&m={}", Get, Options);

			ADD_METHOD_TO(server::FileServer::getFile, "/file?name={}", Options, Get, "server::AuthFilter");
			ADD_METHOD_TO(server::FileServer::putFile, "/file?name={}", Options, Put, "server::AuthFilter");
			ADD_METHOD_TO(server::FileServer::patchFile, "/file?name={}", Options, Patch, "server::AuthFilter");
			ADD_METHOD_TO(server::FileServer::delFile, "/file?name={}", Options, Delete, "server::AuthFilter");

			ADD_METHOD_TO(server::FileServer::getFileList, "/files?path={}", Options, Post, "server::AuthFilter");
			ADD_METHOD_TO(server::FileServer::getVolumeList, "/volumes", Options, Post, "server::AuthFilter");

			ADD_METHOD_TO(server::FileServer::isFileOrDirectory, "/isFileOrDirectory?name={}", Options, Get, "server::AuthFilter");

			ADD_METHOD_TO(server::FileServer::getFileInfo, "/fileinfo?name={}", Options, Get, "server::AuthFilter");

			ADD_METHOD_TO(server::FileServer::sys_copy, "/file/copy?src={}&dest={}", Options, Post, "server::AuthFilter");
			ADD_METHOD_TO(server::FileServer::sys_move, "/file/move?src={}&dest={}", Options, Post, "server::AuthFilter");
			ADD_METHOD_TO(server::FileServer::sys_link, "/file/link?src={}&dest={}", Options, Post, "server::AuthFilter");

			ADD_METHOD_TO(server::FileServer::newDir, "/file/new/dir", Options, Post, "server::AuthFilter");

			ADD_METHOD_TO(server::FileServer::sysShellExecute, "/sys/ShellExecute", Options, Post, "server::AuthFilter");
			ADD_METHOD_TO(server::FileServer::sysCreateProcess, "/sys/CreateProcess", Options, Post, "server::AuthFilter");
		METHOD_LIST_END



		void auth(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const;

		void downloadFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file, std::string&& tok, std::string&& attachment, std::string&& mimeType) const;

		void getFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const;
		void putFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const;
		void patchFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const;
		void delFile(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const;

		void getFileList(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const;
		void getVolumeList(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const;

		void isFileOrDirectory(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const;

		void getFileInfo(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& file) const;
		
		void sys_copy(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& src, std::string&& dest) const;
		void sys_move(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& src, std::string&& dest) const;
		void sys_link(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, std::string&& src, std::string&& dest) const;

		void newDir(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const;

		void sysShellExecute(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const;
		void sysCreateProcess(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) const;

	public:
		FileServer() {

		}

		static const bool isAutoCreation = false;
	};
}



