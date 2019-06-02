const express = require('express')
const socket = require('socket.io')
const body_parser = require('body-parser')
let urlencoded_parser = body_parser.urlencoded({ extended: true })
const serv_lib = require('./serv_lib')

let app = express()

app.set('view engine', 'ejs')
app.use('/assets', express.static('assets'))

const port = 8000
const word_bank = [
    "baseball", "coffee", "apartment", "eyelash", "cushion", "pokemon", "artist",
    "bison", "restaurant", "moustache", "computer", "ladybug", "explosion", "boulder",
    "egypt", "planet", "universe", "dandelion", "garbage", "shovel", "telephone"
]

let username
let words = serv_lib.pick_three_words(word_bank)

let socket_to_names = {}
let socket_to_points = {}
let socket_ids

let option_picked = false

let current_socket = 0
let chosen_word = null
let correct_guess_players = []

const round_time = 10
let current_time = round_time

//------------------------------------------------------------------------------------
// All website endpoints
// Home page
app.get('/', function(req, res) {
    res.render('index.ejs')
})

// Game page
app.post('/game', urlencoded_parser, function(req, res) {
    username = req.body.username
    res.render('game.ejs', {username, words})
})
//------------------------------------------------------------------------------------

let server = app.listen(port)

let io = socket(server)
io.on('connection', function(socket) {
    console.log(socket.id)
    //------------------------------------------------------------------------------------
    // Holds the username and points of new socket, and the chat room and player list for other
    // sockets reflects their connection
    socket_to_names[socket.id] = username
    socket_to_points[socket.id] = 0
    serv_lib.add_message("<li><b>" + socket_to_names[socket.id] + " has joined." + "</b></li>")

    io.sockets.emit('update-player-list', {usernames: Object.values(socket_to_names)})
    io.sockets.emit('update-chat-history', {chat_history: serv_lib.chat_history})

    socket_ids = Object.keys(socket_to_names)
    if (socket.id !== socket_ids[current_socket]) {
        socket.emit('update-option-values', {words: ["Hidden", "Hidden", "Hidden"]})
    }
    //------------------------------------------------------------------------------------
    // A disconnected socket is removed from username and point dictionaries, and the chat room and 
    // player list for remaining sockets reflects their exit
    socket.on('disconnect', function() {
        serv_lib.add_message("<li><b>" + socket_to_names[socket.id] + " has left." + "</b></li>")
        delete socket_to_names[socket.id]
        delete socket_to_points[socket.id]

        io.sockets.emit('update-player-list', {usernames: Object.values(socket_to_names)})
        io.sockets.emit('update-chat-history', {chat_history: serv_lib.chat_history})
        socket_ids = Object.keys(socket_to_names)
    })
    //------------------------------------------------------------------------------------
    // All sockets update their chat history when any client sends a message
    socket.on('update-chat-history', function(data) {
        // A guessing user must guess correctly and also can't keep repeating the correct word to receive points
        if (socket.id !== socket_ids[current_socket] && data.message === chosen_word && correct_guess_players.indexOf(socket.id) < 0) {
            serv_lib.add_message("<li><i>" + socket_to_names[socket.id] + " guessed the word correctly!" + "</i></li>")
            socket_to_points[socket.id] += (5 * current_time)
            correct_guess_players.push(socket.id)
        } else {
            serv_lib.add_message("<li>" + socket_to_names[socket.id] + ": " + data.message + "</li>")
        }
        io.sockets.emit('update-chat-history', {chat_history: serv_lib.chat_history})
    })
    //-----------------------------------------------------------------------------------
    // All sockets are notified when the current socket has picked a word and a countdown starts
    socket.on('update-option-choice', function(data) {
        if (socket.id === socket_ids[current_socket] && !option_picked) {
            option_picked = true
            chosen_word = data.choice
            socket.emit('update-option-choice', {choice: "You picked to draw " + chosen_word + "."})
            socket.broadcast.emit('update-option-choice', {choice: "Guess the word!"})
            
            // Notifies clients initially and at every step of the countdown
            io.sockets.emit('update-timer', {time_message: socket_to_names[socket.id] + " has " + current_time + " seconds left..."})
            let timer = setInterval(function() {
                current_time -= 1
                io.sockets.emit('update-timer', {time_message: socket_to_names[socket.id] + " has " + current_time + " seconds left..."})

                if (current_time === 0) {
                    // Reset round affected data
                    option_picked = false
                    correct_guess_players = []
                    current_time = round_time
                    clearInterval(timer)
                    io.sockets.emit('clear-choice-and-timer')
                    // The next socket in the list is given its turn and if all sockets have had a turn,
                    // the winner is calculated and displayed
                    if (current_socket === socket_ids.length - 1) {
                        current_socket = 0
                        serv_lib.add_message("<li>" + serv_lib.calculate_winner_message(socket_to_points, socket_to_names) + "</li>")
                        io.sockets.emit('update-chat-history', {chat_history: serv_lib.chat_history})
                    } else {
                        current_socket++
                    }
                    io.sockets.emit('paint-clear')
                    io.sockets.emit('round-end')
                }
            }, 1000)
        }
    })
    //-----------------------------------------------------------------------------------------
    // Gives words to sockets after previous round ends
    socket.on('give-words', () => {
        socket.emit('update-option-values', {words: ["Hidden", "Hidden", "Hidden"]})
        if (socket.id === socket_ids[current_socket]) {
            words = serv_lib.pick_three_words(word_bank)
            socket.emit('update-option-values', {words})
        }
    })
    //-----------------------------------------------------------------------------------------
    // These serve as gatekeepers, only allowing the current socket to draw
    socket.on('paint-start', function(data) {
        if (socket.id === socket_ids[current_socket] && option_picked) {
            io.sockets.emit('paint-start', data)
        }
    })
    socket.on('paint-continue', function(data) {
        if (socket.id === socket_ids[current_socket] && option_picked) {
            io.sockets.emit('paint-continue', data)
        }
    })
    //-----------------------------------------------------------------------------------------
})