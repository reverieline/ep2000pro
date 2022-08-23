const {SerialPort} = require('serialport');

if(process.argv.length<3){
    console.log("Usage: node index.js <port>\nExample: node index.js COM6");
    process.exit(0);
}
const port=process.argv[2];
const format=process.argv.length>3?process.argv[3]:"json";

var com = new SerialPort({
    path: port,
    baudRate: 9600,
    databits: 8,
    parity: 'none',
    autoOpen: false
});

com.open((error) => {
    if (error) {
        console.log('Unable to open port: ' + error);
        process.exit(1);
    } else { // Request RO values
        accum1 = Buffer.alloc(0);
        com.write(hexstr2bytes("0A 03 75 30 00 1B 1E B9"));
        com.on("data", (data) => { // wait for 59 bytes
            accum1 = Buffer.concat([accum1, data]);
            if (accum1.length == 59) {
                const res1 = handleComReturnedBuffer(accum1);

                // Request RW values
                let accum2 = Buffer.alloc(0);
                com.write(hexstr2bytes("0A 03 79 18 00 0A 5D ED"));
                com.on("data", (data) => { // wait for 25 bytes
                    accum2 = Buffer.concat([accum2, data]);
                    if (accum2.length == 25) {
                        const res2 = handleComReturnedBuffer(accum2);
                        publishRes(res1, res2);
                        com.close();
                    }
                });
            }
        });

    }
});


function hexstr2bytes(hexstr) {
    hexstr = hexstr.replace(/ /g, "");
    let bytes = [];
    for (let c = 0; c < hexstr.length; c += 2) 
        bytes.push(parseInt(hexstr.substr(c, 2), 16));
    return bytes;
}

function strRemove(str, from, length) {
    let arr = str.split('');
    arr.splice(from, length);
    return arr.join('');
}

function handleComReturnedBuffer(buf) {
    let hexstr = "";
    for (let i = 0; i < buf.length; i++) {
        let h = buf[i].toString(16);
        if (h.length == 1) 
            h = '0' + h;
        hexstr += h + " ";
    }
    hexstr = hexstr.toUpperCase();

    hexstr = strRemove(hexstr, 0, 8);
    let str = strRemove(hexstr, hexstr.length - 6, 5).trim();

    for (let startIndex = str.length - 1; startIndex >= 0; -- startIndex) {
        if (startIndex % 6 == 2) 
            str = strRemove(str, startIndex, 1);
    }
    return str.split(' ');
}

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

const EPWokrState = {
    INIT: 1,
    SELF_CHECK: 2,
    BACKUP: 3,
    LINE: 4,
    STOP: 5,
    POWER_OFF: 6,
    GRID_CHG: 7,
    SOFT_START: 8
}
const EPLoadState = {
    LOAD_NORMAL: 0,
    LOAD_ALARM: 1,
    OVER_LOAD: 2
}
const EPAVRState = {
    AVR_BYPASS: 0,
    AVR_STEPDWON: 1,
    AVR_BOOST: 2
}
const EPBuzzerState = {
    BUZZ_OFF: 0,
    BUZZ_BLEW: 1,
    BUZZ_ALARM: 2
}

const EPFault = {
    0: "",
    1: "Fan is locked when inverter is off",
    2: "Inverter transformer over temperature",
    3: "battery voltage is too high",
    4: "battery voltage is too low",
    5: "Output short circuited",
    6: "Inverter output voltage is high",
    7: "Overload time out",
    8: "Inverter bus voltage is too high",
    9: "Bus soft start failed",
    11: "Main relay failed",
    21: "Inverter output voltage sensor error",
    22: "Inverter grid voltage sensor error",
    23: "Inverter output current sensor error",
    24: "Inverter grid current sensor error",
    25: "Inverter load current sensor error",
    26: "Inverter grid over current error",
    27: "Inverter radiator over temperature",
    31: "Solar charger battery voltage class error",
    32: "Solar charger current sensor error",
    33: "Solar charger current is uncontrollable",
    41: "Inverter grid voltage is low",
    42: "Inverter grid voltage is high",
    43: "Inverter grid under frequency",
    44: "Inverter grid over frequency",
    51: "Inverter over current protection error",
    52: "Inverter bus voltage is too low",
    53: "Inverter soft start failed",
    54: "Over DC voltage in AC output",
    56: "Battery connection is open",
    57: "Inverter control current sensor error",
    58: "Inverter output voltage is too low",
    61: "Fan is locked when inverter is on.",
    62: "Fan2 is locked when inverter is on.",
    63: "Battery is over-charged.",
    64: "Low battery",
    67: "Overload",
    70: "Output power Derating",
    72: "Solar charger stops due to low battery",
    73: "Solar charger stops due to high PV voltage",
    74: "Solar charger stops due to over load",
    75: "Solar charger over temperature",
    76: "PV charger communication error",
    77: "Parameter error"
};

const EPChargeState = {
    CC: 0,
    CV: 1,
    FV: 2
}
const EPChargeFlag = {
    UnCharge: 0,
    Charge: 1
}
const EPMainSw = {
    Off: 0,
    On: 1
}

const EPBuzzerSilence = {
    Normal: 0,
    Silence: 1
}

function publishRes(res1, res2) {
    const output = {};

    output['MachineType'] = res1[0];
    output['SoftwareVersion'] = parseInt(res1[1], 16);
    output['WorkState'] = getKeyByValue(EPWokrState, parseInt(res1[2], 16));
    output['BatClass'] = parseInt(res1[3], 16) + 'V';
    output['RatedPower'] = parseInt(res1[4], 16);
    output['GridVoltage'] = parseInt(res1[5], 16) * 0.1;
    output['GridFrequency'] = (parseInt(res1[6], 16) * 0.1).toString().substring(0, 5);
    output['OutputVoltage'] = (parseInt(res1[7], 16) * 0.1).toString().substring(0, 6);
    output['OutputFrequency'] = (parseInt(res1[8], 16) * 0.1).toString().substring(0, 5);
    output['LoadCurrent'] = (parseInt(res1[9], 16) * 0.1).toString().substring(0, 6);
    output['LoadPower'] = parseInt(res1[10], 16);
    output['LoadPercent'] = parseInt(res1[12], 16);
    output['LoadState'] = getKeyByValue(EPLoadState, parseInt(res1[13], 16));
    output['BatteryVoltage'] = (parseInt(res1[14], 16) * 0.1).toString().substring(0, 5);
    output['BatteryCurrent'] = (parseInt(res1[15], 16) * 0.1).toString().substring(0, 5);
    output['BatterySoc'] = parseInt(res1[17], 16);
    output['TransformerTemp'] = parseInt(res1[18], 16);
    output['AvrState'] = getKeyByValue(EPAVRState, parseInt(res1[19], 16));
    output['BuzzerState'] = getKeyByValue(EPBuzzerState, parseInt(res1[20], 16));
    output['Fault'] = EPFault[parseInt(res1[21], 16)];
    output['Alarm'] = parseInt(res1[22], 16);
    output['ChargeState'] = getKeyByValue(EPChargeState, parseInt(res1[23], 16));
    output['ChargeFlag'] = getKeyByValue(EPChargeFlag, parseInt(res1[24], 16));
    output['MainSw'] = getKeyByValue(EPMainSw, parseInt(res1[25], 16));
    output['DelayType'] = parseInt(res1[26], 16);

    output['GridFrequencyType'] = parseInt(res2[0], 16);
    output['GridVoltageType'] = parseInt(res2[1], 16) + "V";
    output['BulkChargeCurrent'] = parseInt(res2[5], 16);
    output['BatteryLowVoltage'] = parseInt(res2[2], 16) * 0.1 + "V";
    output['ConstantChargeVoltage'] = (parseInt(res2[3], 16) * 0.1).toString().substr(0, 5) + "V";
    output['FloatChargeVoltage '] = (parseInt(res2[4], 16) * 0.1).toString().substr(0, 5) + "V";
    output['BuzzerSilence'] = getKeyByValue(EPBuzzerSilence, parseInt(res2[6], 16));
    output['EnableGridCharge'] = parseInt(res2[7], 16) == 0 ? "Enable" : "Disable";
    output['EnableKeySound'] = parseInt(res2[8], 16) == 0 ? "Enable" : "Disable";
    output['EnableBacklight'] = parseInt(res2[9], 16) == 0 ? "Disable" : "Enable";

    if(format!='json')
        Object.keys(output).forEach(k=>console.log(k+":"+output[k]));
    else 
        console.log(JSON.stringify(output));
    
}
