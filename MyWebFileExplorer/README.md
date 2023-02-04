# My Web File Explorer User Manual

## Installation
1. Run ./bin/Web-File-Explorer_x64.exe
2. Check the server listen port (default is 48720, you can change it)
3. If you need to access the server remotely, check the Allow Global Access box. (In this case, we very suggest you to add a valid SSL cert, or someone will be able to decrypt and edit the unsafe HTTP request!)
4. Add some password(s) in the Credentials Editor. Just input your password, and click the "Add" button.
5. Click the "Start Server" button and wait a moment.
6. If no error occurred, the server is running now. Click "Copy" to copy the server address and connect it with [our public site](https://shc0743.github.io/Web-File-Explorer/); click "Open" to open it (Web experience pack required).

## Uninstallation
1. Check "Show hidden files" in Explorer Options.
2. Click "Stop server" and wait a moment.
3. Close the application's window and wait a moment.
4. Delete the application and `.AppName.exe.data`. For example, you saved the app as `WFE.exe`, you should delete `WFE.exe` and `.WFE.exe.data`.
5. Done! Thanks for using the application.

## Command-Line Options
```
Web-File-Explorer.exe [--type=<TYPE>] [OPTIONS]

--type=<TYPE>   Specify the type of the process. For example,
                run "--type=ui" will create a UI process.

<TYPE>          Specify the type string. These are available:
                    ui      start UI Process
                    server  start server process


-------- UI Options
These options need   --type=ui   option.

--new-instance          By default, you can only open one instance of 
                        the application at the same time. Use this
                        option, you can open lots of instances at one
                        time.

--instance-dir=<DIR>    IF you are using --new-instance, you should
                        specify a new directory to put the data of the 
                        new instance, or they will conflict and may 
                        stop working. Example:   --type=ui --new-instance --instance-dir=C:\ANYPATH\

-------- Server Options
These options need   --type=server option.

// TODO

```
