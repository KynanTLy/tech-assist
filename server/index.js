const express = require("express");
const fs = require("fs");
var cors = require("cors");
const bodyParser = require("body-parser");
const speech = require("@google-cloud/speech");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());
app.use(cors());
const port = 8000;
const SPREADSHEET_ID = '10oX-86DeSJPXBuIJdhJr_744ccdZAX5yrM6si_Jhj8E';
const GOOGLE_BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

const client = new speech.SpeechClient();

//==

const googleSpreadSheet = require('google-spreadsheet');
const {promisify} = require('util');
const cred = require('./google-sheets.json');
const doc = new googleSpreadSheet(SPREADSHEET_ID);


async function accessSpread(question,correct,wrong1,wrong2,wrong3){

  await promisify(doc.useServiceAccountAuth)(cred);
  const info = await promisify(doc.getInfo)();
  const sheet = info.worksheets[1];
  console.log('Loaded doc: '+info.title+' by '+info.author.email);
  console.log('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);
  //console.log(sheet);

  const cells = await promisify(sheet.getCells)({
    'min-row': 1,
    'max-row': sheet.rowCount,
    'min-col': 1,
    'max-col': 5,
    'return-empty': true

  });
  console.log("Start...");
  var i;
  for (i = 0; i < sheet.rowCount*5; i+=5) {
    //console.log(cells[i]);
    //console.log(cells[i].value)
    if(cells[i].value.length == 0){
      break
    }
  }
  console.log("i = " + i );
  cells[i].value = question
  cells[i+1].value = correct
  cells[i+2].value = wrong1
  cells[i+3].value = wrong2
  cells[i+4].value = wrong3

  for (y = i; y < i+5; y++){
    cells[y].save();
    //console.log(y);
  }

/*
  cells[6].value = "sd";
  cells[6].save();
  console.log(cells[8]);
  cells[8].value = "sdsfdsfd";
  cells[8].save();
*/
}

//==

async function transcribe() {
  console.log("Transcription started");
  const fileName = "./test-record.flac"; // TODO - pull file that is given from somewhere

  // Reads a local audio file and converts it to base64
  const file = fs.readFileSync(fileName);
  const audioBytes = file.toString("base64");

  // The audio file's encoding, sample rate in hertz, and BCP-47 language code
  const audio = {
    content: audioBytes
  };
  const config = {
    encoding: "FLAC", // TODO - need a different encoding
    languageCode: "en-US",
    audioChannelCount: 2, // dependant on the Mac versions
    enableSeparateRecognitionPerChannel: true
  };
  const request = {
    audio: audio,
    config: config
  };

  try {
    const [response] = await client.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join("\n");
    console.log(`Transcription: ${transcription}`);
  } catch (err) {
    console.log(err);
  }
}

app.get("/", (req, res) => res.send("Hello World!"));

app.get("/speech", (req, res) => {
  transcribe().then(transcription => {
    return res.send(transcription);
  });
});

app.post("/submit", (req, res) => {
  console.log("posting")
  console.log(req.body.correctAnswer);
  accessSpread(req.body.question,req.body.correctAnswer,req.body.wrongAnswer1,req.body.wrongAnswer2,req.body.wrongAnswer3);
  /*
  axios
    .get(
      `${GOOGLE_BASE_URL}/values/question!A1:A4?key=AIzaSyC9ovMWO6Iobe5mZWozI67Qq1iBWQdOnTM`
    )
    .then(res => {
      console.log(res);
    })
    .catch(err => {
      console.log(err);
    });*/
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));