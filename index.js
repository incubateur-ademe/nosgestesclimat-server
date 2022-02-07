//Require the express moule
const express = require("express");
const answersRoute = require("./answersRoute");
const surveysRoute = require("./surveysRoute");
const bodyParser = require("body-parser");
const cors = require("cors");

//create a new express application
const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:8080",
  })
);

//routes
app.use("/answers", answersRoute);
app.use("/surveys", surveysRoute);

//require the http module
const http = require("http").Server(app);

// require the socket.io module
const socketio = require("socket.io");

const port = 3000;

const io = socketio(http, {
  cors: { origin: "http://localhost:8080", methods: ["GET", "POST"] },
});

const Answer = require("./AnswerSchema");
const Survey = require("./SurveySchema");
const connect = require("./database");

//create an event listener
//
//To listen to messages
io.on("connection", (socket) => {
  console.log("user connected");

  socket.on("disconnect", function () {
    console.log("user disconnected");
  });
  socket.on("answer", function ({ room, answer }) {
    socket.join(room);
    console.log("message: " + JSON.stringify(answer, null, 2));
    //broadcast message to everyone in port:5000 except yourself.
    socket.to(room).emit("received", { answer });

    connect.then((db) => {
      console.log("connected correctly to the server");

      const query = { id: answer.id },
        update = answer,
        options = { upsert: true, new: true, setDefaultsOnInsert: true };

      // Find the document
      Answer.findOneAndUpdate(query, update, options, function (error, result) {
        if (error) return;

        // do something with the document
      });
    });
  });
});

//wire up the server to listen to our port 500
http.listen(port, () => {
  console.log("connected to port: " + port);
});
