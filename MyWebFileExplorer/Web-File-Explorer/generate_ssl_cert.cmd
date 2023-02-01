@echo off

REM @SSL Cert generator using OpenSSL
REM   v 1.0
REM Copyright © 2023 shc0743<github.com/shc0743>
REM 
REM Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
REM 
REM The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
REM
REM THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

echo this is trashed
pause&exit /b


if "%1"=="" goto error1
if "%2"=="" goto error2
if "%3"=="" goto error2
goto start


:error1
echo ERROR: OpenSSL Binary not found
timeout 3
exit /b 1
:error2
echo ERROR: Output file not found
timeout 3
exit /b 1



:start

title SSL Cert Generator
echo OpenSSL: %1
echo;

set /p days=How many days should this certificate expire? (days) 
set /p c=What is the country? (2 letter) 
set /p st=What is your state? 
set /p l=What is your localcity? 
set /p org=What is the organization name? 
set /p ou=What is the OU (organization unit)? 
set /p cname=What is the CNAME if you knows? (if you don't know, just press Enter to skip) 
if "%cname%"=="" set cname=127.0.0.1
set /p email=What is the email address of this certificate? 
set /p altName=What is the alt name of this certificate? 

set subject="/C=%c%/ST=%st%/L=%l%/O=%org%/OU=%ou%/CN=%cname%/emailAddress=%email%/subjectAltName=%altName%"

echo ================================================
echo ^| Please review your options:
echo ^| %subject%
echo ================================================

choice /c yn /m "Is this correct?"
if "%ERRORLEVEL%"=="1" goto gen
echo ================================================
echo;
goto start


:gen
echo ================================================
echo Trying to generate...
echo;
%1 req -newkey rsa:4096 -nodes -keyout %2 -x509 -days %days% -out %3 -subj %subject%
echo;
if "%ERRORLEVEL%"=="0" goto success
echo Ooops! something happened.
choice /c yn /m "Try again?"
if "%ERRORLEVEL%"=="1" goto start
echo;
echo Failed to generate.
timeout 3
exit /b 1

:success
echo Generated successfully!
echo Your private key is: %2
echo Your public cert is: %3
echo;
timeout 3
exit /b 0


