let socket = io.connect("http://localhost:8000");   // Client-side socket

// Get all drawing related HTML elements
let canvas = document.getElementById('canvas')
let ctx = canvas.getContext('2d')
let red = document.getElementById('red'),
    blue = document.getElementById('blue'),
    green = document.getElementById('green'),
    yellow = document.getElementById('yellow'),
    orange = document.getElementById('orange'),
    purple = document.getElementById('purple'),
    brown = document.getElementById('brown'),
    black = document.getElementById('black'),
    white = document.getElementById('white')
// Organize color buttons
let colors = [red, blue, green, yellow, orange, purple, brown, black, white]
let mouse_held = false;
let brush_thickness = 2;
let color = "black"
let prevX = 0,
    prevY = 0,
    currX = 0,
    currY = 0

canvas.addEventListener('mousedown', function(e) {
    prevX = currX
    prevY = currY
    currX = e.clientX - canvas.offsetLeft
    currY = e.clientY - canvas.offsetTop

    mouse_held = true;

    socket.emit('paint-start', {currX: currX, currY: currY, color: color, brush_thickness: brush_thickness})
})
socket.on('paint-start', function(data) {
    ctx.beginPath();
    ctx.fillStyle = data.color;
    ctx.fillRect(data.currX, data.currY, data.brush_thickness, data.brush_thickness);
    ctx.closePath();
})
canvas.addEventListener('mousemove', function(e) {
    if (mouse_held) {
        prevX = currX
        prevY = currY
        currX = e.clientX - canvas.offsetLeft
        currY = e.clientY - canvas.offsetTop
        
        socket.emit('paint-continue', {prevX: prevX, prevY: prevY, currX: currX, currY: currY, color: color, brush_thickness: brush_thickness})
    }
})
socket.on('paint-continue', function(data) {
    ctx.beginPath();
    ctx.moveTo(data.prevX, data.prevY);
    ctx.lineTo(data.currX, data.currY);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.brush_thickness;
    ctx.stroke();
    ctx.closePath();
})
socket.on('paint-clear', function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
})
canvas.addEventListener('mouseup', function(e) {
    mouse_held = false
})
canvas.addEventListener('mouseout', function(e) {
    mouse_held = false
})
colors.forEach(function(item) {
    item.addEventListener('click', function(e) {
        color = item.id;
    })
})

// Handles updating player-list html
let player_list = document.getElementById('player-list')
socket.on('update-player-list', function(data) {
    player_list.innerHTML = ""
    data.usernames.forEach((username) => {
        player_list.innerHTML += "<li>" + username + "</li>"
    })
})


let chat_history = document.getElementById('chat-history')
let user_message = document.getElementById('message')
let submit_message = document.getElementById('submit-message')
// Listens for any submitted chat messages to send to the server
submit_message.addEventListener('click', function() {   // Clicking "send message" button
    socket.emit('update-chat-history', {message: user_message.value})
    user_message.value = ""     // Erases user-types chat message
})
user_message.addEventListener('keydown', function(e) {  // Pressing Enter key
    if (e.keyCode === 13) {
        socket.emit('update-chat-history', {message: user_message.value})
        user_message.value = ""     // Erases user-types chat message
    }
})
// Handles updating chat-history html with server-processed chat messages
socket.on('update-chat-history', function(data) {
    chat_history.innerHTML = ""
    data.chat_history.forEach(function(message) {
        chat_history.innerHTML += message
    })
})

// Option buttons
let option_one = document.getElementById('option-one')
let option_two = document.getElementById('option-two')
let option_three = document.getElementById('option-three')
// Paragraphs
let clock = document.getElementById('clock')
let choice = document.getElementById('choice')

// Tells server which option is picked by the client
option_one.addEventListener('click', function() {
    socket.emit('update-option-choice', {choice: option_one.innerHTML})
})
option_two.addEventListener('click', function() {
    socket.emit('update-option-choice', {choice: option_two.innerHTML})
})
option_three.addEventListener('click', function() {
    socket.emit('update-option-choice', {choice: option_three.innerHTML})
})

// Handles updating which word the client whose turn it is picked
socket.on('update-option-choice', function(data) {
    choice.innerHTML = data.choice
})

socket.on('update-option-values', function(data) {
    option_one.innerHTML = data.words[0]
    option_two.innerHTML = data.words[1]
    option_three.innerHTML = data.words[2]
})

socket.on('update-timer', function(data) {
    clock.innerHTML = data.time_message
})

socket.on('clear-choice-and-timer', function() {
    choice.innerHTML = ""
    clock.innerHTML = ""
})

socket.on('round-end', function() {
    socket.emit('give-words')
})