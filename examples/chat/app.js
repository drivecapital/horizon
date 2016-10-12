function uuid() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}

	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

var horizon = Horizon({
	authType: {
		token: window.authToken,
		storeLocally: false
	}
});
var userId = JSON.parse(atob(window.authToken.split('.')[1])).id;
var horizonMessages = horizon('messages');

function handleReceiveMessages(messages) {
	var $messages = document.getElementById('messages');
	while ($messages.firstChild) {
		$messages.removeChild($messages.firstChild);
	}

	messages.forEach(function (message) {
		var $message = document.createElement('li');
		$message.className = 'Message';

		var $avatar = document.createElement('img');
		$avatar.className = 'Message-avatar';
		$avatar.src = 'http://api.adorable.io/avatars/40/' + message.user + '.png';
		$message.appendChild($avatar);

		var $text = document.createElement('span');
		$text.className = 'Message-text';
		$text.textContent = message.text;
		$message.appendChild($text);

		$messages.appendChild($message);
	});
}

function handleSendMessage(event) {
	event.preventDefault();

	var text = event.target.elements.text.value;
	event.target.elements.text.value = '';

	horizonMessages.store({
		id: uuid(),
		text: text,
		timestamp: new Date(),
		user: userId
	});
}

horizonMessages.order('timestamp', 'descending')
	.limit(8)
	.watch()
	.subscribe(handleReceiveMessages);

document.querySelector('form').addEventListener('submit', handleSendMessage);
