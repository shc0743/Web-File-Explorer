export function fileinfo(fullpath) {
    if (fullpath.includes('\\')) fullpath = fullpath.replaceAll('\\', '/');
    return {
        fullpath: fullpath,
        path: fullpath.substring(0, fullpath.lastIndexOf('/')),
        name: fullpath.substring(fullpath.lastIndexOf('/') + 1),
        ext: fullpath.substring((fullpath.lastIndexOf('.') + 1) || (fullpath.length)),
    }
}
