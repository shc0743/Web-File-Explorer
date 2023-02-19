export function fileinfo(fullpath) {
    if (fullpath.includes('\\')) fullpath = fullpath.replaceAll('\\', '/');
    return {
        fullpath: fullpath,
        path: fullpath.substring(0, fullpath.lastIndexOf('/')),
        name: fullpath.substring(fullpath.lastIndexOf('/') + 1),
        ext: fullpath.substring((fullpath.lastIndexOf('.') + 1) || (fullpath.length)),
    }
}
export function prettyPrintFileSize(size) {
    if (isNaN(size)) return size;
    size = +size;
    const units = ['Byte', 'KB', 'MB', 'GB', 'TB', 'EB'], n = 1024, d = 6;
    let newSize = size, unit = units[0];
    for (let i = 0, unitslen = units.length; i < unitslen; ++i) {
        unit = units[i];
        let _val = Math.floor((newSize / n) * (10 ** d)) / (10 ** d);
        if (_val < 1 || i + 2 > unitslen) break;
        newSize = _val;
        unit = units[i + 1];
    }
    return newSize + ' ' + unit + (unit !== units[0] ? (` (${size} ${units[0]})`) : '');
}
