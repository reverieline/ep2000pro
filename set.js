const {SerialPort} = require('serialport');
const crc = require('crc');

if(process.argv.length<5){
    console.log(`Usage: node set.js <port> <reg> <value>
Examples:
    node set.js COM4 shutdown_voltage 10.5
    node set.js COM4 absorption_voltage 14.1
    node set.js COM4 float_voltage 13.6
    node set.js COM4 bulk_current 10
    node set.js COM4 buzzer_silence off
    node set.js COM4 grid_charge on
    node set.js COM4 backlight off
    node set.js COM4 utility_power on
    node set.js COM4 overload_recovery on
`);
    process.exit(0);
}
const port=process.argv[2];
const reg=process.argv[3];
const val=process.argv[4];

var com = new SerialPort({
    path: port,
    baudRate: 9600,
    databits: 8,
    parity: 'none',
    autoOpen: false
});

com.open((error) => {
    if (error) {
        console.error('Unable to open port: ' + error);
        process.exit(1);
    } else { // Request RO values
        accum1 = Buffer.alloc(0);
        
        const f=fn[reg];
        if(undefined==f){
            console.error(`Error: invalid register "${reg}"`);
            process.exit(1);
        }
        
        const p=f(val);
        if(undefined==p){
            console.error(`Error: invalid value "${val}"`);
            process.exit(1);
        }

        const crc=calculateCRC16Modbus(p);
        const packet=Buffer.concat([Buffer(p),Buffer([crc&0xff,crc>>8&0xff])]);

        com.write(packet);
        com.on("data", (data) => { // wait for 59 bytes
            accum1 = Buffer.concat([accum1, data]);
            if (accum1.length == 8) {
                console.log(accum1.slice(0,6).equals(packet.slice(0,6))?"ok":"error");
                com.close();
            }
        });
    }
});

function calculateCRC16Modbus(data) {
    return crc.crc16modbus(Buffer.from(data));
}

function hexstr2bytes(hexstr) {
    hexstr = hexstr.replace(/ /g, "");
    let bytes = [];
    for (let c = 0; c < hexstr.length; c += 2) 
        bytes.push(parseInt(hexstr.substr(c, 2), 16));
    return bytes;
}

const fn={
    "shutdown_voltage":(val)=>{
        const a=[0x0a ,0x10 ,0x79 ,0x1a ,0x00 ,0x01 ,0x02 ,0x00 ,0x64];
        const v=parseFloat(val);
        if(Number.isNaN(v))return;
        a[8]=v*10;
        return a;
    },
    "absorption_voltage":(val)=>{
        const a=[0x0a ,0x10 ,0x79 ,0x1b ,0x00 ,0x01 ,0x02 ,0x00 ,0x8a];
        const v=parseFloat(val);
        if(Number.isNaN(v))return;
        a[8]=v*10;
        return a;
    },
    "float_voltage":(val)=>{
        const a=[0x0a ,0x10 ,0x79 ,0x1c ,0x00 ,0x01 ,0x02 ,0x00 ,0x88];
        const v=parseFloat(val);
        if(Number.isNaN(v))return;
        a[8]=v*10;
        return a;
    },
    "bulk_current":(val)=>{
        const a=[0x0a ,0x10 ,0x79 ,0x1d ,0x00 ,0x01 ,0x02 ,0x00 ,0x05];
        const v=parseInt(val);
        if(Number.isNaN(v))return;
        a[8]=v;
        return a;
    },
    "buzzer_silence":(val)=>{
        const a=[0x0a ,0x10 ,0x79 ,0x1e ,0x00 ,0x01 ,0x02 ,0x00 ,0x01];
        if("on"==val)a[8]=1;
        else if("off"==val)a[8]=0;
        else return;
        return a;
    },
    "grid_charge":(val)=>{
        const a=[0x0a ,0x10 ,0x79 ,0x1f ,0x00 ,0x01 ,0x02 ,0x00 ,0x01];
        if("on"==val)a[8]=0;
        else if("off"==val)a[8]=1;
        else return;
        return a;
    },
    
    "backlight":(val)=>{
        const a=[0x0a ,0x10 ,0x79 ,0x21 ,0x00 ,0x01 ,0x02 ,0x00 ,0x01];
        if("on"==val)a[8]=1;
        else if("off"==val)a[8]=0;
        else return;
        return a;
    },
    "utility_power":(val)=>{
        const a=[0x0a ,0x10 ,0x79 ,0x28 ,0x00 ,0x01 ,0x02 ,0x00 ,0x01];
        if("on"==val)a[8]=0;
        else if("off"==val)a[8]=1;
        else return;
        return a;
    },
    "overload_recovery":(val)=>{
        const a=[0x0a ,0x10 ,0x79 ,0x29 ,0x00 ,0x01 ,0x02 ,0x00 ,0x00];
        if("on"==val)a[8]=1;
        else if("off"==val)a[8]=0;
        else return;
        return a;
    },
}