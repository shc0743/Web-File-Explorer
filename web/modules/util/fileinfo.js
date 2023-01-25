export function fileinfo(fullpath) {
    if (fullpath.includes('\\')) fullpath = fullpath.replaceAll('\\', '/');
    return {
        fullpath: fullpath,
        name: fullpath.substring(fullpath.lastIndexOf('/') + 1),
        ext: fullpath.substring((fullpath.lastIndexOf('.') + 1) || (fullpath.length)),
    }
}
