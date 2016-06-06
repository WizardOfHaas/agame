//Event vector
var player_events = {
	"move": player_move_event,
	"enter_room": player_enter_room
};

var map_events = {
	"enter_side_chamber": enter_side_chamber
};

var item_events = {
	"on_puddle": item_on_puddle,
	"hit_rock": item_hit_rock
};

//Player event functions
function player_move_event(player, game){
	if(player.wetness && player.wetness > 0){
		player.wetness--;

		add_item({
			"item": "water",
			"description": "Your feet get wet",
			"location": player.path[player.path.length - 2],
			"events": {
				"enter": "on_puddle"
			}
		}, game);

		print_msg("You track water all over the floor!", game);
	}
}

function player_enter_room(player, game, event){
	if(game.map.rooms[event].description){
		print_msg(game.map.rooms[event].description, game);
	}
}

//Map event functions
function enter_side_chamber(player, game, event){
	
}

//Item events
function item_on_puddle(player, game, event){
	if(game.items.items[event].description){
		print_msg(game.items.items[event].description, game);
	}

	if(!player.wetness || player.wetness == 0){
		player.wetness = 3;
	}
}

function item_hit_rock(player, game, event){
	console.log(item_side(player.location, game.items.items[event]));
}