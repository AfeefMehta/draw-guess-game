let serv_lib = {}

serv_lib.max_chat_history_size = 25
serv_lib.chat_history = []

// Randomly picks three unique words from given word bank
serv_lib.pick_three_words = (word_bank) => {
    first_index = Math.floor(Math.random() * word_bank.length)
    second_index = Math.floor(Math.random() * word_bank.length)
    third_index = Math.floor(Math.random() * word_bank.length)

    // Any identical indices are re-randomly chosen to get distinct words
    while (second_index === first_index) {
        second_index = Math.floor(Math.random() * word_bank.length)
    }
    while (third_index === first_index || third_index === second_index) {
        third_index = Math.floor(Math.random() * word_bank.length)
    }

    return [word_bank[first_index], word_bank[second_index], word_bank[third_index]]
}

// Determines round end message from the top 3 highest scoring players
serv_lib.calculate_winner_message = (socket_to_points, socket_to_names) => {
    let winning_players = [{id: "No player", points: 0},    // First place
                           {id: "No player", points: 0},    // Second place
                           {id: "No player", points: 0}]    // Third place
    let players = Object.keys(socket_to_points)

    // Check every connected players points
    for (let i = 0; i < players.length; i++) {
        let points = socket_to_points[players[i]]
        // Give current player first place
        if (points >= winning_players[0].points) {
            winning_players.unshift({id: players[i], points: points})
            winning_players.pop()
        // Give current player second place
        } else if (points >= winning_players[1].points) {
            winning_players.splice(1, 0, {id: players[i], points: points})
            winning_players.pop()
        // Give current player third place
        } else if (points >= winning_players[2].points) {
            winning_players.pop()
            winning_players.push({id: players[i], points: points})
        }
    }

    // Creates final winning message, but doesn't include empty "No player" spots
    let winning_message = ""
    if (winning_players[0].id !== "No player") {
        winning_message += "First place: " + socket_to_names[winning_players[0].id] + " with " + winning_players[0].points + " points."
    }
    if (winning_players[1].id !== "No player") {
        winning_message += " Second place: " + socket_to_names[winning_players[1].id] + " with " + winning_players[1].points + " points."
    }
    if (winning_players[2].id !== "No player") {
        winning_message += " Third place: " + socket_to_names[winning_players[2].id] + " with " + winning_players[2].points + " points."
    }

    return winning_message
}

serv_lib.add_message = (message) => {
    if (serv_lib.chat_history.length === serv_lib.max_chat_history_size) {
        serv_lib.chat_history.shift()
    }
    serv_lib.chat_history.push(message)
}

module.exports = serv_lib