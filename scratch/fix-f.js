const fs = require('fs');
const path = require('path');

const previewPath = path.join(__dirname, '../src/app/preview/[id]/page.tsx');
const fPath = path.join(__dirname, '../src/app/f/[token]/page.tsx');

let previewCode = fs.readFileSync(previewPath, 'utf8');
let fCode = fs.readFileSync(fPath, 'utf8');

const mapStartStr = '{currentSection.questions?.map((q, qIndex) => {';
const mapEndStr = '              })}';

const mapStartIndex = previewCode.indexOf(mapStartStr);
const mapEndIndex = previewCode.indexOf(mapEndStr, mapStartIndex) + mapEndStr.length;

let mapLoop = previewCode.substring(mapStartIndex, mapEndIndex);

// Remove MessageSquare button from mapLoop
mapLoop = mapLoop.replace(/<button[\s\S]*?MessageSquare[\s\S]*?<\/button>/, '');

const fMapStartStr = '{currentSection.questions?.map((q, qIndex) => (';
const fMapEndStr = '              ))}';

const fMapStartIndex = fCode.indexOf(fMapStartStr);
const fMapEndIndex = fCode.indexOf(fMapEndStr, fMapStartIndex) + fMapEndStr.length;

fCode = fCode.substring(0, fMapStartIndex) + mapLoop + fCode.substring(fMapEndIndex);

const qrStartStr = 'function QuestionRenderer';
const qrStartIndex = previewCode.indexOf(qrStartStr);
let qrCode = previewCode.substring(qrStartIndex);

const fQrStartIndex = fCode.indexOf(qrStartStr);
fCode = fCode.substring(0, fQrStartIndex) + qrCode;

fs.writeFileSync(fPath, fCode);
console.log('Fixed f/[token]/page.tsx successfully!');
