const horizon = Horizon({
	authType: {
		token: window.authToken,
		storeLocally: false
	}
});

const uuid = () => {
	const s4 = () =>
		Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1);

	return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};

class App extends React.Component {

	constructor() {
		super();

		// Set initial data
		this.horizon = horizon('messages');
		this.state = { messages: [] };
		this.user = Date.now(); // Generate a random ID for the user

		// Cache avatar
		const avatar = new Image();
		avatar.src = `http://api.adorable.io/avatars/40/${this.user}.png`;

		// Bind handlers
		this.handleSend = this.handleSend.bind(this);
	}

	componentDidMount() {
		this.horizon
			.order('timestamp', 'descending')
			.limit(8)
			.watch()
			.subscribe((messages) => {
				this.setState({ messages });
			});
	}

	componentWillUnmount() {
		this.horizon.disconnect();
	}

	handleSend(message) {
		this.horizon.store({
			id: uuid(),
			text: message,
			timestamp: new Date(),
			user: this.user
		});
	}

	render() {
		return (
			<div className="App">
				<Messages messages={this.state.messages} />
				<Input onSend={this.handleSend} />
			</div>
		);
	}

}

class Messages extends React.Component {

	render() {
		return (
			<ol className="Messages">
				{this.props.messages.map((message) => (
					<Message key={message.id} {...message} />
				))}
			</ol>
		);
	}

}

class Message extends React.Component {

	render() {
		return (
			<li className="Message">
				<img className="Message-avatar" src={`http://api.adorable.io/avatars/40/${this.props.user}.png`} />
				<span className="Message-text">{this.props.text}</span>
			</li>
		);
	}

}

class Input extends React.Component {

	constructor() {
		super();

		this.state = {
			text: ''
		};

		// Bind handlers
		this.handleChange = this.handleChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleChange(event) {
		this.setState({ text: event.target.value });
	}

	handleSubmit(event) {
		event.preventDefault();
		this.setState({ text: '' });
		this.props.onSend(event.target.elements.text.value);
	}

	render() {
		return (
			<form className="Input" onSubmit={this.handleSubmit}>
				<input autoFocus className="Input-text" name="text" onChange={this.handleChange} type="text" value={this.state.text} />
			</form>
		);
	}

}

ReactDOM.render(
	<App />,
	document.getElementById('app')
);
