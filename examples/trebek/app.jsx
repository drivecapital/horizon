'use strict';

// Makes a map out of a list given a property name to use as the key
const mapify = (property, list) => {
	const map = {};
	for (const item of list) {
		map[item[property]] = item;
	}
	return map;
};

const pick = (property) => (object) => object[property];

// Given a predicate, split a list into a left list of items that match the
// predicate and a right list of items that don't
const split = (predicate, list) => {
	const left = [];
	const right = [];
	for (const item of list) {
		if (predicate(item)) {
			left.push(item);
		} else {
			right.push(item);
		}
	}
	return [left, right];
};

const NO_BREAK_SPACE = '\xA0';

const horizon = Horizon({
	authType: {
		token: window.authToken,
		storeLocally: false
	}
});

const userId = JSON.parse(atob(window.authToken.split('.')[1])).id;

class App extends React.Component {

	constructor() {
		super();

		// Set initial state
		this.state = {
			categories: [],
			cluesById: {}
		};

		// Bind event handlers
		this.handleSelect = this.handleSelect.bind(this);
	}

	componentDidMount() {
		this.fetchClues();
	}

	componentWillUnmount() {
		this.willUnmount = true;
	}

	async fetchAllClues() {
		return await (await fetch('/clues.json')).json();
	}

	fetchAskedClues() {
		return new Promise((resolve, reject) => {
			horizon('clues')
				.order('timestamp', 'descending')
				.fetch()
				.subscribe(resolve, reject);
		});
	}

	async fetchClues() {
		const [allClues, askedClues] = await Promise.all([
			this.fetchAllClues(),
			this.fetchAskedClues()
		]);

		if (!this.willUnmount) {
			const askedClueIds = new Set(askedClues.map(({ id }) => id));
			const cluesById = {};
			const categories = allClues.map((category) => ({
				name: category.name,
				clues: category.clues.map((clue) => {
					cluesById[clue.id] = {
						...clue,
						asked: askedClueIds.has(clue.id),
						category: category.name
					};
					return clue.id;
				})
			}));

			this.setState({
				categories,
				cluesById
			});
		}
	}

	handleSelect(id) {
		const clue = this.state.cluesById[id];

		if (!clue.asked) {
			this.setState({
				cluesById: {
					...this.state.cluesById,
					[id]: {
						...clue,
						asked: true
					}
				}
			});
			horizon('clues').store({
				category: clue.category,
				clue: clue.clue,
				id: clue.id,
				timestamp: new Date()
			});
		}
	}

	render() {
		return (
			<div className="App">
				<Board
					categories={this.state.categories}
					cluesById={this.state.cluesById}
					onSelect={this.handleSelect}
				/>
				<Scores />
				<Clue cluesById={this.state.cluesById} />
			</div>
		);
	}

}

const Board = ({ categories, ...props }) => (
	<table className="Board">
		<thead>
			<tr>
				{categories.map(({ name }) => (
					<th key={name}>{name}</th>
				))}
			</tr>
		</thead>
		<Cells {...props} categories={categories} />
	</table>
);

const Cells = ({ categories, cluesById, ...props }) => {
	// HTML tables are row-based, so transpose the column-based categories
	const rows = [];
	const height = Math.max(...categories.map(({ clues }) => clues.length));
	for (let i = 0; i < height; i++) {
		rows.push(categories.map(({ clues }) => clues[i]));
	}

	return (
		<tbody>
			{rows.map((row, i) => (
				<tr key={i}>
					{row.map((qid) => (
						<Cell
							{...props}
							{...cluesById[qid]}
							key={qid}
						/>
					))}
				</tr>
			))}
		</tbody>
	);
};

const Cell = ({ asked, clue, id, onSelect }) => (
	<td className="Cell" onClick={() => onSelect(id)}>
		{asked ? NO_BREAK_SPACE : '100'}
	</td>
);

class Scores extends React.Component {

	constructor() {
		super();

		// Set initial state
		this.state = { scores: [] };
	}

	componentDidMount() {
		this.scores = horizon('scores')
			.watch()
			.subscribe((scores) => {
				this.setState({ scores });
			});
	}

	componentWillUnmount() {
		this.scores.unsubscribe();
	}

	render() {
		const userScores = this.state.scores.reduce((users, { points, userId }) => ({
			...users,
			[userId]: (users[userId] || 0) + points
		}), {});
		const sorted = Object.keys(userScores).sort((a, b) =>
			userScores[a] - userScores[b]
		);

		return (
			<table className="Scores">
				<thead>
					<tr>
						{sorted.map((user) =>
							<th key={user}>{user}</th>
						)}
					</tr>
				</thead>
				<tbody>
					<tr>
						{sorted.map((user) =>
							<td key={user}>{userScores[user]}</td>
						)}
					</tr>
				</tbody>
			</table>
		);
	}

}

// Display a clue, optionally display the correct response, show responses
class Clue extends React.Component {

	constructor() {
		super();

		// Set initial state
		this.state = {
			clue: null,
			reveal: false
		};

		// Bind event handlers
		this.handleToggleResponse = this.handleToggleResponse.bind(this);
	}

	componentDidMount() {
		this.clues = horizon('clues')
			.order('timestamp', 'descending')
			.limit(1)
			.watch()
			.subscribe(([clue]) => {
				this.setState({
					clue,
					reveal: false
				});
			});
	}

	componentWillUnmount() {
		this.clues.unsubscribe();
	}

	handleToggleResponse() {
		this.setState({
			reveal: !this.state.reveal
		});
	}

	render() {
		if (!this.state.clue) return null;

		const clue = {
			...this.state.clue,
			...this.props.cluesById[this.state.clue.id]
		};
		return (
			<div className="Clue">
				<p>{clue.category}</p>
				<p>{clue.clue}</p>
				{this.state.reveal ? (
					<p>{clue.response}</p>
				) : (
					<button onClick={this.handleToggleResponse}>
						Show answer
					</button>
				)}
				<Responses key={clue.id} clueId={clue.id} />
			</div>
		);
	}

}

class Responses extends React.Component {

	constructor() {
		super();

		// Set initial state
		this.state = {
			responses: [],
			responsesById: {},
			scored: {}
		};

		// Bind event handlers
		this.handleCorrect = this.handleCorrect.bind(this);
		this.handleIncorrect = this.handleIncorrect.bind(this);
	}

	componentDidMount() {
		this.responses = horizon('responses')
			.findAll({ clueId: this.props.clueId })
			.order('timestamp', 'ascending')
			.watch()
			.subscribe((responses) => {
				this.setState({
					responses: responses.map(pick('id')),
					responsesById: mapify('id', responses),
				 });
			});
		this.scores = horizon('scores')
			.watch()
			.subscribe((scores) => {
				this.setState({
					scored: mapify('responseId', scores)
				});
			});
	}

	componentWillUnmount() {
		this.responses.unsubscribe();
		this.scores.unsubscribe();
	}

	handleCorrect(id) {
		horizon('scores')
			.store({
				clueId: this.props.clueId,
				points: 100,
				responseId: id,
				userId: this.state.responsesById[id].userId
			});
	}

	handleIncorrect(id) {
		this.setState({
			scored: {
				...this.state.scored,
				[id]: true
			}
		});
		horizon('scores')
			.store({
				clueId: this.props.clueId,
				points: -100,
				responseId: id,
				userId: this.state.responsesById[id].userId
			});
	}

	render() {
		const respondedUsers = new Set();
		const allResponses = this.state.responses
			.map((id) => this.state.responsesById[id])
			// Only let users submit one response each
			.filter(({ userId }) => {
				if (respondedUsers.has(userId)) {
					return false;
				} else {
					respondedUsers.add(userId);
					return true;
				}
			});
		const [scoredResponses, unscoredResponses] = split(
			({ id }) => this.state.scored.hasOwnProperty(id),
			allResponses
		);

		return (
			<ol className="Responses">
				{scoredResponses.map((response) =>
					<Response {...response} key={response.id} />
				)}
				{unscoredResponses.slice(0, 1).map((response) =>
					<Response
						{...response}
						key={response.id}
						onCorrect={this.handleCorrect}
						onIncorrect={this.handleIncorrect}
					/>
				)}
			</ol>
		);
	}

}

const Response = ({ id, onCorrect, onIncorrect, response, userId }) => (
	<li className="Response">
		<span className="Response-user">{userId}</span>
		<span className="Response-text">{response}</span>
		{onCorrect &&
			<button onClick={() => onCorrect(id)}>Correct</button>
		}
		{onIncorrect &&
			<button onClick={() => onIncorrect(id)}>Incorrect</button>
		}
	</li>
);

ReactDOM.render(
	<App />,
	document.getElementById('app')
);
