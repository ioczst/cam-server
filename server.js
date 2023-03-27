const http = require('http')
const UDP = require('dgram')
const serverUDP = UDP.createSocket('udp4')
const portUDP = 7000
const portHTTP = 8000

const NMAX = 1460
const N = NMAX-12

var g_ts=0

var framePacketArr = []
var frameDataArr =[]
var frameData = new Buffer.alloc(0)


function isFrameValid() {

    if (frameDataArr.length ==0)  return false
    var startBuf = frameDataArr[0]
    var endBuf = frameDataArr[frameDataArr.length - 1]

    if (startBuf.length == (N - 6) &&
        startBuf[0] == 255 &&
        startBuf[1] == 216 &&
        startBuf[2] == 255) { // FF D8 FF          

        if (endBuf.length >= 2 &&
            endBuf.length < (N - 6) &&
            endBuf[endBuf.length - 2] == 255 &&
            endBuf[endBuf.length - 1] == 217) { // FF D9
            return true
        }
    }
    return false

}

function setFrameData(){
    frameDataArr = []
    for (let i = 0; i < framePacketArr.length; i++) {
        frameDataArr.push(framePacketArr[i].data)
    }
    if(isFrameValid()) {
        frameData = Buffer.concat(frameDataArr)
    };
}

function removeDuplicatedPacket() {
    framePacketArr = framePacketArr.reduce((acc, current) => {
        const x = acc.find(item => item.seq === current.seq);
        if (!x) {
            return acc.concat([current]);
        } else {
            return acc;
        }
    }, []);
}

function reOrderPacket() {
    framePacketArr.sort(function (a, b) {
        if (a.seq < b.seq) return -1;
        if (a.seq > b.seq) return 1;
        return 0;
    });
    for (let i = 0; i < framePacketArr.length; i++) {
        console.log("seq: ", framePacketArr[i].seq)
    }
}

serverUDP.on('message', (packet, info) => {
    var seq = packet.readUInt16BE(0)
    var ts = packet.readUInt32BE(2)
    var data = packet.subarray(6,packet.length)

    if (ts > g_ts) {
        console.log("\ntimestamp: ", g_ts)
        removeDuplicatedPacket()
        reOrderPacket()       
        setFrameData()   
        framePacketArr = []
    }
    if (ts >= g_ts) {
        framePacketArr.push({ "seq": seq, "data": data })
    }
    g_ts = ts

});



serverUDP.bind(portUDP)


const serverHTTP = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=--test' })

    function sendFrameData() {
        res.write(`--test\nContent-Type: image/jpeg\nContent-length: ${frameData.length}\n\n`)
        res.write(frameData)
        setTimeout(sendFrameData, 50)
    }

    setTimeout(sendFrameData, 50)
})

serverHTTP.listen(portHTTP)
console.log('Server running!')