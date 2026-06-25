Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Check if server already running on port 4173
serverRunning = False
Set objHTTP = CreateObject("MSXML2.ServerXMLHTTP")
On Error Resume Next
objHTTP.Open "GET", "http://localhost:4173", False
objHTTP.setTimeouts 500, 500, 1000, 1000
objHTTP.Send
If Err.Number = 0 Then
    If objHTTP.Status > 0 Then serverRunning = True
End If
On Error GoTo 0

' If server not running, start it silently (no black window)
If Not serverRunning Then
    Dim projectPath
    projectPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
    
    Dim cmd
    cmd = "cmd /c cd /d """ & projectPath & """ && node server.js"
    
    ' Run hidden (0 = hidden window)
    WshShell.Run cmd, 0, False
    
    ' Wait for server to start
    WScript.Sleep 3000
End If

' Open Admin Portal in browser
WshShell.Run "http://localhost:4173/login.html?portal=admin"
