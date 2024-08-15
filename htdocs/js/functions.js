function authenticate() {
	$("#dialog-auth").dialog({
		dialogClass: "no-close",
		buttons: {
			"OK": function() {
				$( this ).dialog( "close" );
				getappstream("describe_stacks", {}, list_stacks);
			}
		}
	})
}

function get_auth_vars() {
	auth_text = $("#auth_text").val().split("\n");
	auth_data = {}
	auth_data['region_name'] = $("#region_name").val()
	if (auth_text.length != 3) {
		return false
	}
	auth_text.forEach(function(i) {
		temp=i.match(/^export ([^=]+)="([^"]+)"/)
		if (temp === null) {
			return false
		}
		auth_data[temp[1].toLowerCase()] = temp[2];
	})
	return auth_data;
}

function hide_error() {
	$("#status").addClass("ui-helper-hidden")
	$("#errortext").text("")
}

function show_error(message) {
	$("#status").removeClass("ui-helper-hidden")
	$("#errortext").text(message)
}

function getappstream(method, params, result_func) {
	hide_error()
	auth_data = get_auth_vars();
	if (auth_data === false) {
		show_error("Invalid Authentication");
		return
	}
	data = {...params, ...auth_data}
	data['action'] = 'appstream';
	data['method'] = method;
	$.ajax({
		type: "POST",
		url: "/do",
		dataType: "json",
		contentType : 'application/json',
		data: JSON.stringify(data),
		success: result_func,
		error: function(event) {
			show_error(event.responseJSON.explain)
		}
	})

}

function getrdp(ipaddress) {
	hide_error()
	data = {
		action: 'rdp',
		ipaddress: ipaddress
	}
	$.ajax({
		type: "POST",
		url: "/do",
		responseType: "blob",
		contentType : 'application/json',
		data: JSON.stringify(data),
		success: function(response, status, xhr) {
			// check for a filename
			var filename = "";
			var disposition = xhr.getResponseHeader('Content-Disposition');
			if (disposition && disposition.indexOf('attachment') !== -1) {
				var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
				var matches = filenameRegex.exec(disposition);
				if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
			}

			var type = xhr.getResponseHeader('Content-Type');
			var blob = new Blob([response], { type: type });

			if (typeof window.navigator.msSaveBlob !== 'undefined') {
				// IE workaround for "HTML7007: One or more blob URLs were revoked by closing the blob for which they were created. These URLs will no longer resolve as the data backing the URL has been freed."
				window.navigator.msSaveBlob(blob, filename);
			} else {
				var URL = window.URL || window.webkitURL;
				var downloadUrl = URL.createObjectURL(blob);

				if (filename) {
					// use HTML5 a[download] attribute to specify filename
					var a = document.createElement("a");
					// safari doesn't support this yet
					if (typeof a.download === 'undefined') {
						window.location = downloadUrl;
					} else {
						a.href = downloadUrl;
						a.download = filename;
						document.body.appendChild(a);
						a.click();
					}
				} else {
					window.location = downloadUrl;
				}

				setTimeout(function () { URL.revokeObjectURL(downloadUrl); }, 100); // cleanup
			}
		},
		error: function(event) {
			$("#status").removeClass("ui-helper-hidden")
			$("#errortext").text(event.responseJSON.explain)
			console.log(event)
		}
	})

}

function result_func(data) {
	if (data.ok === "error") {
		$(".queryresult").text(data.message);
		return;
	}
	$(".queryresult").val(JSON.stringify(data, null, "\t"));
}

function list_stacks(stack_res) {
	console.log(stack_res);
	stackarea = $(".stacks");
	stackselect = $("#stack_select")
		.html($("<option>").html("Select a Stack"));
	stack_res.Stacks.forEach(function(stack) {
		stackselect.append(
			$("<option>").text(stack.Name)
				.data("key", stack))
	})
}

function show_stack(event) {
	$("#stacksdata").html("");
	$("#sessions").html("");
	stack = $("#stack_select option:selected").data().key;
	if (stack === undefined ) {
		return
	}
	console.log(stack)
	$("#stacksdata")
		.append($("<table>")
			.append($("<tr>")
				.append($("<th>").text("Name"))
				.append($("<td>").text(stack.Name))
				)
			.append($("<tr>")
				.append($("<th>").text("Display Name"))
				.append($("<td>").text(stack.DisplayName))
				)
			.append($("<tr>")
				.append($("<th>").text("Created Time"))
				.append($("<td>").text(stack.CreatedTime))
				)
			.append($("<tr>")
				.attr("id", "associated_fleets")
				.append($("<th>").text("Associated Fleets"))
				)
			);
	getappstream("list_associated_fleets", {
		StackName: stack.Name
	}, show_associated_fleets);
}

function show_associated_fleets(af_res) {
	afs=$("#associated_fleets").data("key", af_res);
	if ( af_res.Names.length == 0) {
		afs.append($("<td>").text("No fleets associated"));
		return;
	}
	af_res.Names.forEach(function(name) {
		afs.append($("<td>").text(name));
	})
	afs.parent()
		.append($("<tr>")
			.append($("<td>")
				.attr("colspan", 2)
				.css("width", "100%")
				)
			);
	params = {
		StackName: $("#stack_select option:selected").data().key.Name,
		FleetName: af_res.Names[0]
	}
	getappstream("describe_sessions", params, show_sessions)
}

function get_sessions(event) {
	params = {
		StackName: $("#stack_select option:selected").data().key.Name,
		FleetName: $("#associated_fleets").data().key.Names[0]
	}
	console.log(params);
	getappstream("describe_sessions", params, show_sessions)
}

function show_sessions(session_res) {
	if (session_res.Sessions.length == 0) {
		$("#sessions").html("No sessions found");
		return;
	}
	$("#sessions").html($("<table>")
		.addClass("sessiontable")
		.append($("<caption>").text("List of users connected"))
		.append($("<thead>")
			.append($("<tr>")
				.append($("<th>")
					.attr("scope", "col")
					.addClass("sessiontable")
					.text("User")
					)
				.append($("<th>")
					.attr("scope", "col")
					.addClass("sessiontable")
					.text("Time since start")
					)
				.append($("<th>")
					.attr("scope", "col")
					.addClass("sessiontable")
					.text("State")
					)
				.append($("<th>")
					.attr("scope", "col")
					.addClass("sessiontable")
					.text("ConnectionState")
					)
				.append($("<th>")
					.attr("scope", "col")
					.addClass("sessiontable")
					.text("IP")
					)
				.append($("<th>")
					.attr("scope", "col")
					.addClass("sessiontable")
					.text("Actions")
					)
				)
			)
		.append($("<tbody>"))
		)
	session_res.Sessions.forEach(function(session) {
		$("#sessions table tbody")
			.append($("<tr>")
				.data("key", session)
				.append($("<td>")
					.attr("scope", "row")
					.addClass("sessiontable")
					.text(session.UserId)
					)
				.append($("<td>")
					.text(TimeSince(session.StartTime))
					.addClass("sessiontable")
					)
				.append($("<td>")
					.text(session.State)
					.addClass("sessiontable")
					)
				.append($("<td>")
					.text(session.ConnectionState)
					.addClass("sessiontable")
					)
				.append($("<td>")
					.text(session.NetworkAccessConfiguration.EniPrivateIpAddress)
					.addClass("sessiontable")
					)
				.append($("<td>")
					.addClass("sessiontable")
					.append($("<button>")
						.button()
						.text("RDP")
						.on("click", rdp_connect)
						)
					.append($("<button>")
						.button()
						.text("Terminate Session")
						.on("click", terminate_session)
						)
					)
			)
	})
	if(session_res['NextToken'] !== undefined) {
		$("#sessions").append($("<button>")
			.attr("id", "sessions_next")
			.on("click", function() {
				params = {
					StackName: $("#stack_select option:selected").data().key.Name,
					FleetName: $("#associated_fleets").data().key.Names[0],
					NextToken: session_res['NextToken']
				}
				getappstream("describe_sessions", params, show_sessions)
			}))
	}
}

function rdp_connect(event) {
	session_data = $(this).parents("tr").data().key
	console.log("Connecting to: " + session_data.NetworkAccessConfiguration.EniPrivateIpAddress);
	getrdp(session_data.NetworkAccessConfiguration.EniPrivateIpAddress)
}

function terminate_session(event) {
	session_data = $(this).parents("tr").data().key
	$("#session_username").text(session_data.UserId)
	$( "#dialog-terminate-session" ).dialog({
		resizable: false,
		height: "auto",
		width: 400,
		modal: true,
		buttons: {
			"Terminate Session": function() {
				$( this ).dialog( "close" );
				confirm_terminate_session(session_data);
			},
			Cancel: function() {
				$( this ).dialog( "close" );
			}
		}
	});
	console.log("Terminating session: " + session_data.Id);
}

function confirm_terminate_session(session) {
	params = {
		SessionId: session.Id
	}
	getappstream("expire_session", params, get_sessions)
	$("#stack_select").trigger("change")
}

function TimeSince(starttime_str) {
	starttime = Date.parse(starttime_str)
	secondssincestart = Math.floor((Date.now() - starttime) / 1000);
	indays = Math.floor(secondssincestart / 60 / 60 / 24);
	secondssincestart -= indays * 60 * 60 * 24;
	inhours = Math.floor(secondssincestart / 60 / 60);
	secondssincestart -= inhours * 60 * 60;
	inminutes = Math.floor(secondssincestart / 60);
	secondssincestart -= inminutes * 60;
	if (indays > 0) {
		return "Over " + indays + " days";
	}
	return inhours.toString().padStart(2, 0) + 
		":" + inminutes.toString().padStart(2, 0) + 
		":" + secondssincestart.toString().padStart(2, 0);
}
