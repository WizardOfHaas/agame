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

	game.merged_region = game.merged_region.filter(function(el){
		return game.merged_items_region.indexOf(el) == -1;
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
	return game.merged_region.indexOf(location[0] + "," + location[1]) > -1;
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

function player_within_map(player, game){
	return game.merged_region.indexOf(player.location[0] + "," + player.location[1]) > -1;
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
	for(var c = 0; c < region_size; c++){
		for(var r = 0; r < region_size; r++){
			region.push([
				player.location[0] - Math.floor(region_size / 2) + r,
				player.location[1] - Math.floor(region_size / 2) + c
			]);
		}
	}

	//Filter for regions within map	
	region = region.filter(function(location){
		return within_map(location, game);
	});

	player.view = region;

	return region;
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

function move_player_to(player, game, location){
	if(within_map(location, game)){
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

		return -1;
	}

	return location;
}

function player_traj(player, game){
	if(player.path.length > 2){
		return
			[
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