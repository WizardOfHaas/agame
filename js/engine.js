//Map Functions
var g = 20;

function fetch_game(game_path, callback){
	$.get(game_path, function(game){
		$.get(game.map_set.path, function(map){
			$.get(game.item_set.path, function(items){
				load_scripting(game, function(){
					game.map = map;
					game.items = items;
					callback(game);
				});
			});
		});
	});
}

function render_room(ctx, room, game){
	ctx.beginPath();

	ctx.fillStyle = room.style.fill || "#000000";
	ctx.strokeStyle = room.style.border_color || "#000000";
	ctx.lineWidth = room.style.border_width || "1";

	var location = room.location;
	var items = game.items;

	//Draw Room
	ctx.fillRect(
		(location[0])*g,
		(location[1])*g,
		(room.size[0])*g,
		(room.size[1])*g
	);

	ctx.rect(
		(location[0])*g,
		(location[1])*g,
		(room.size[0])*g,
		(room.size[1])*g
	);

	//Draw Grid
	ctx.lineWidth = 0.5;

	for(var i = 0; i < room.size[0]; i++){		
		ctx.rect(
			(location[0] + i)*g,
			(location[1])*g,
			g,
			(room.size[1])*g
		);
	}

	for(var i = 0; i < room.size[1]; i++){		
		ctx.rect(
			(location[0])*g,
			(location[1] + i)*g,			
			(room.size[0])*g,
			g
		);
	}

	ctx.stroke();

	//Expand region to grid
	var map_region = [];

	for(var col = 0; col < room.size[1]; col++){
		for(var row = 0; row < room.size[0]; row++){
			map_region.push(
				[
					row + room.location[0],
					col + room.location[1]
				]
			);
		}
	}

	return map_region;
}

function render_item(ctx, item, game){
	var location = item.location;
	var item_data = game.items.item_set[item.item];

	ctx.beginPath();

	ctx.fillStyle = item_data.style.fill || "#000000";
	ctx.strokeStyle = item_data.style.border_color || "#000000";
	ctx.lineWidth = item_data.style.border_width || "1";

	//Draw Room
	ctx.fillRect(
		(location[0])*g,
		(location[1])*g,
		(item_data.size[0])*g,
		(item_data.size[1])*g
	);

	ctx.rect(
		(location[0])*g,
		(location[1])*g,
		(item_data.size[0])*g,
		(item_data.size[1])*g
	);

	//Expand region to grid
	var item_region = [];

	for(var col = 0; col < item_data.size[1]; col++){
		for(var row = 0; row < item_data.size[0]; row++){
			item_region.push(
				[
					row + item.location[0],
					col + item.location[1]
				]
			);
		}
	}

	return item_region;
}

function render_items(ctx, items, game){
	var items_region = [];
	var solid_region = [];
	var merged_regions = [];

	//Render each item
	items.forEach(function(item, i){
		item.id = i;

		var region = render_item(ctx, item, game);

		//Add to the right buckets
		if(game.items.item_set[item.item].solid == true){
			solid_region.push(region);
		}

		items_region.push(region);
		merged_regions.push(region.map(function(d){
			return d.join(",");
		}));
	});

	//Flatten each array and reutrn it
	return {
		items_region: [].concat.apply([], items_region),
		solid_region: [].concat.apply([], solid_region),
		merged_regions: merged_regions
	};
}

function render_map(ctx, map, game){
	game.ctx = ctx;

	var items = game.items;
	var map_regions = [];
	var merged_regions = [];

	//Render the map
	map.rooms.forEach(function(room){
		var region = render_room(ctx, room, game);
		map_regions.push(region);
		merged_regions.push(
			region.map(function(d){return d[0] + "," + d[1]})
		);
	});

	//Generate regions for hit detection
	game.map_regions = map_regions;
	game.map_tiles = [].concat.apply([], game.map_regions);
	game.merged_regions = merged_regions;	

	//Render items
	game.item_regions = render_items(ctx, items.items, game);

	//Create merged list of playable tiles
	game.merged_region = game.map_tiles.map(function(d){
		return d[0] + "," + d[1];
	});

	//Remove solid items from playable tile list
	game.merged_items_region = game.item_regions.solid_region.map(function(d){
		return d[0] + "," + d[1];
	});
}

//Player functions
function setup_player(game){
	return game.start_state.player;
}

function render_player(ctx, player, game){
	player.ctx = ctx;

	if(player.shade && player.shade == true){
		player_view(player, game);
		render_player_view(player, game);
	}else{
		ctx.clearRect(0, 0, 1024, 512);
	}

	var map = game.map;

	ctx.beginPath();

	ctx.fillStyle = player.style.fill || "#000000";
	ctx.strokeStyle = player.style.border_color || "#000000";
	ctx.lineWidth = player.style.border_width || "1";

	var location = player.location;

	//Draw Player
	ctx.fillRect(
		(location[0] + 0.1)*g,
		(location[1] + 0.1)*g,
		0.8*g,
		0.8*g
	);

	ctx.rect(
		(location[0] + 0.1)*g,
		(location[1] + 0.1)*g,
		0.8*g,
		0.8*g
	);

	ctx.stroke();
}

function within_map(location, game){
	return (game.merged_region.indexOf(location[0] + "," + location[1]) > -1);
}

function within_room(location, game){
	var room = -1;
	var player_location = location[0] + "," + location[1];

	for(var r = 0; r < game.map_regions.length; r++){
		if(game.merged_regions[r].indexOf(player_location) > -1){
			room = r;
		}
	}

	return room;
}

function player_within_map(location, game){
	return (game.merged_region.indexOf(location[0] + "," + location[1]) > -1) &&
		(game.merged_items_region.indexOf(location[0] + "," + location[1]) == -1);
}

function player_within_room(player, game){
	var room = -1;
	var player_location = player.location[0] + "," + player.location[1];

	for(var r = 0; r < game.map_regions.length; r++){
		if(game.merged_regions[r].indexOf(player_location) > -1){
			room = r;
		}
	}

	return room;
}

function player_view(player, game){
	var region_size = player.view_distance;
	var region = [];

	//Create region
	for(var r = 0; r < region_size; r++){
		var row = [];
		for(var c = 0; c < region_size; c++){
			row.push([
				player.location[0] - Math.floor(region_size / 2) + r,
				player.location[1] - Math.floor(region_size / 2) + c
			]);
		}
		region.push(row);
	}

	//Remove tiles not in direct view
	var final_region = [];

	region.map(function(row, r){
		row.map(function(tile, c){
			var ray = line(player.location, tile);
			if(
				ray.map(function(location){
					return (player_within_map(location, game)) || 
						((game.merged_items_region.indexOf(tile[0] + "," + tile[1]) != -1) && within_map(location, game))
				}).reduce(function(a, b){
					return a && b;
				})
			){
				final_region.push(ray);
			}
		});
	});	

	//Flatten. Remove duplicates.
	final_region = [].concat.apply([], final_region);
	final_region = final_region.reduce(function(a,b){
    	if (a.indexOf(b) < 0 ) a.push(b);
    		return a;
  	},[]);

	player.view = final_region;

	return final_region;
}

function render_player_view(player, game){
	player.ctx.beginPath();

	player.ctx.fillStyle = "#000000";
	player.ctx.strokeStyle = "#000000";
	player.ctx.lineWidth = "1";

	//Cast... some SHADE!
	player.ctx.fillRect(0, 0, 1024, 512);

	//Render each tile, by clearing it!
	player.view.map(function(location){	
		player.ctx.clearRect(
			(location[0])*g,
			(location[1])*g,
			g,
			g
		);
	});

	player.ctx.stroke();
}

function on_item(location, game){
	var item = -1;
	var player_location = location[0] + "," + location[1];

	for(var r = 0; r < game.item_regions.merged_regions.length; r++){
		if(game.item_regions.merged_regions[r].indexOf(player_location) > -1){
			item = r;
		}
	}

	return item;
}

function on_solid_item(location, game){
	var item = -1;
	var player_location = location[0] + "," + location[1];

	for(var r = 0; r < game.merged_items_region.length; r++){
		if(game.merged_items_region[r].indexOf(player_location) > -1){
			item = r;
		}
	}

	return item;	
}

function move_player_to(player, game, location){
	if(player_within_map(location, game)){
		player.location = location;

		if(player.path){
			player.path.push(player.location);
		}else{
			player.path = [player.location];
		}

		//Fire player move event
		if(player_events.move){
			player_events[player.events.move](player, game);
		}

		var room = within_room(location, game);

		if(player.room != room){
			//Fire player enter room event
			if(player_events.enter_room){
				player_events[player.events.enter_room](player, game, room);
			}

			//Fire player exit room event
			if(player_events.exit_room){
				player_events[player.events.exit_room](player, game, player.room);
			}

			//Fire room enter event
			if(game.map.rooms[room].events && game.map.rooms[room].events.enter){
				map_events[game.map.rooms[room].events.enter](player, game, room);
			}

			//Fire room exit event
			if(game.map.rooms[room].events && game.map.rooms[room].events.exit){
				map_events[game.map.rooms[room].events.exit](player, game, player.room);
			}

			player.room = room;
		}

		//Fire item on item enter event (for non-solid items)
		var item = on_item(location, game);

		if(item != -1 && player.item != item){
			player.item = item;
			if(game.items.items[item].events && game.items.items[item].events.enter){
				item_events[game.items.items[item].events.enter](player, game, item);
			}
		}else{
			player.item = -1;
		}
	}else{
		//Fire player hit wall event
		//Fire hit room wall event

		//Fire player hit item event (for solid items)
		//Fire item hit item event (for solid items)
		var item = on_solid_item(location, game);
		if(item != -1){
			if(game.items.items[item].events && game.items.items[item].events.hit){
				item_events[game.items.items[item].events.hit](player, game, item);
			}

			if(game.items.item_set[game.items.items[item].item].pushable){
				push_item(player, game, game.items.items[item]);
			}
		}

		return -1;
	}

	return location;
}

function player_traj(player, game){
	if(player.path.length > 2){
		return [
			player.location[0] - player.path[player.path.length - 2][0],
			player.location[1] - player.path[player.path.length - 2][1]
		];		
	}
}

//Event functions
function load_scripting(game, callback){
	$.getScript(game.scripts.path, callback);
}

//HUD functions
function print_msg(msg, game){
	if(game.hud.messages[0] != '<div class="msg">' + msg + '</div>'){
		game.hud.messages.unshift('<div class="msg">' + msg + '</div>');

		while(game.hud.messages.length > 10){
			game.hud.messages.pop();
		}

		$(game.hud.elements.msg).html(game.hud.messages.join(""));
	}
}

//Item functions
function add_item(item, game){
	game.items.items.push(item);	
	render_map(game.ctx, game.map, game)
}

function remove_item(item, game){
	game.items.items.splice(item.id, 1);
	render_map(game.ctx, game.map, game);
}

function update_item(old_item, new_item, game){
	game.items.items.splice(old_item.id, 1);
	game.items.items.push(new_item);
	render_map(game.ctx, game.map, game);
}

function item_side(location, item){
	if(location[0] == item.location[0] && location[1] <= item.location[1]){
		return 0;
	}

	if(location[0] == item.location[0] && location[1] >= item.location[1]){
		return 2;
	}

	if(location[1] == item.location[1] && location[0] >= item.location[0]){
		return 1;
	}

	if(location[1] == item.location[1] && location[0] <= item.location[0]){
		return 3;
	}
}

var push_vector = [
	[0, 1],
	[-1, 0],
	[0, -1],
	[1, 0]
];

function push_item(player, game, item){
	//Get the side
	var side = item_side(player.location, item);

	//Get the base location
	var old_location = [];
	old_location[0] = item.location[0];
	old_location[1] = item.location[1];
	var new_location = old_location;

	//Update the location
	new_location[0] += push_vector[side][0];
	new_location[1] += push_vector[side][1];

	//Is the location legal?
	if(player_within_map(new_location, game)){
		item.location = new_location;
	}

	//Render the game
	render_map(game.ctx, game.map, game);

	//Get the player in the right location
	//player.location = old_location;

	//Re-render the game
	render_player(player.ctx, player, game);
}

//Line Approx stuff//////////////////////////////////////
function lerp(start, end, t) {
    return start + t * (end-start);
}

function lerp_point(p0, p1, t) {
    return [lerp(p0[0], p1[0], t),
                     lerp(p0[1], p1[1], t)];
}

function diagonal_distance(p0, p1) {
    var dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    return Math.max(Math.abs(dx), Math.abs(dy));
}

function round_point(p) {
    return [Math.round(p[0]), Math.round(p[1])];
}

function line(p0, p1) {
    var points = [];
    var N = diagonal_distance(p0, p1);
    for (var step = 0; step <= N; step++) {
        var t = N == 0? 0.0 : step / N;
        points.push(round_point(lerp_point(p0, p1, t)));
    }
    return points;
}
/////////////////////////////////////////////////////////