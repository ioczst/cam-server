const RtpPacket = require("./RtpPacket")
const KaitaiStream = require("kaitai-struct/KaitaiStream");

const http = require('http')
const UDP = require('dgram')
const serverUDP = UDP.createSocket('udp4')
const portUDP = 7000
const portHTTP = 8000

var timestamp

var dataArr = []

var dataSend = new Buffer.alloc(0)



function removeDuplicate() {
    dataArr = dataArr.reduce((acc, current) => {
        const x = acc.find(item => item.sq === current.sq);
        if (!x) {
            return acc.concat([current]);
        } else {
            return acc;
        }
    }, []);
}

function Final() {


    var arrBuf = []


    for (let i = 0; i < dataArr.length; i++) {
        arrBuf.push(dataArr[i].data)
    }

    var startBuf = arrBuf[0]
    var endBuf = arrBuf[arrBuf.length-1]

    if (startBuf.length == (1460 - 12) &&
    startBuf[0] == 255 &&
    startBuf[1] == 216 &&
    startBuf[2] == 255) { // FF D8 FF          

        if (endBuf.length >= 2 &&
            endBuf.length < (1460 - 12) &&
            endBuf[endBuf.length-2] == 255 &&
            endBuf[endBuf.length - 1] == 217) { // FF D9

            dataSend = Buffer.concat(arrBuf);

        }
    }

}

function reOrder() {

    dataArr.sort(function (a, b) {
        if (a.sq < b.sq) return -1;
        if (a.sq > b.sq) return 1;
        return 0;
    });
    for (let i = 0; i < dataArr.length; i++) {
        console.log("sq: ", dataArr[i].sq)
    }
}

serverUDP.on('message', (message, info) => {
    var rtpPacket = new RtpPacket(new KaitaiStream(message));

    // console.log(rtpPacket.timestamp)
    if (rtpPacket.timestamp > timestamp) {
        console.log("\ntimestamp: ", timestamp)
        removeDuplicate()
        reOrder()
        Final()
        dataArr = []
        dataArr.push({ "sq": rtpPacket.sequenceNumber, "data": rtpPacket.data })
    }
    if (rtpPacket.timestamp < timestamp) {

    }
    if (rtpPacket.timestamp == timestamp) {



        dataArr.push({ "sq": rtpPacket.sequenceNumber, "data": rtpPacket.data })
    }
    timestamp = rtpPacket.timestamp

});



serverUDP.bind(portUDP)


const serverHTTP = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=--test' })

    function sendData() {
        res.write(`--test\nContent-Type: image/jpeg\nContent-length: ${dataSend.length}\n\n`)
        res.write(dataSend)
        setTimeout(sendData, 50)
    }

    setTimeout(sendData, 50)
})

serverHTTP.listen(portHTTP)
console.log('Server running!')