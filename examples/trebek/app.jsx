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
		<thead className="Board-categories">
			<tr>
				{categories.map(({ name }) => (
					<th className="Board-category" key={name}>{name}</th>
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
			<div className="Responses">
				{/*scoredResponses.map((response) =>
					<Response {...response} key={response.id} />
				)*/}
				{unscoredResponses.slice(0, 1).map((response) =>
					<Response
						{...response}
						key={response.id}
						onCorrect={this.handleCorrect}
						onIncorrect={this.handleIncorrect}
					/>
				)}
			</div>
		);
	}

}

const Response = ({ id, onCorrect, onIncorrect, response, userId }) => (
	<div className="Response">
		<p className="Response-user">{userId}</p>
		<p className="Response-text">{response}</p>
		{onCorrect &&
			<button className="Response-correct" onClick={() => onCorrect(id)}>
				<svg
					x="0px"
					y="0px"
					viewBox="0 0 100 100"
				>
					{/* Created by Austin Condiff from the Noun Project */}
					<title>Incorrect</title>
					<path d="M68.604,36.099L43.513,61.19L32.396,50.073c-0.781-0.781-2.048-0.781-2.828,0  c-0.781,0.781-0.781,2.047,0,2.828l12.531,12.532c0.375,0.375,0.884,0.585,1.414,0.585s1.039-0.21,1.414-0.585l26.506-26.506  c0.781-0.781,0.781-2.047,0-2.828S69.385,35.317,68.604,36.099z" />
					<path d="M50,8C27.234,8,8,27.233,8,50s19.234,42,42,42s42-19.233,42-42S72.766,8,50,8z M50,88  c-20.598,0-38-17.402-38-38s17.402-38,38-38s38,17.402,38,38S70.598,88,50,88z" />
				</svg>
			</button>
		}
		{onIncorrect &&
			<button className="Response-incorrect" onClick={() => onIncorrect(id)}>
				<svg
					x="0px"
					y="0px"
					viewBox="0 0 100 100"
				>
					{/* Created by Austin Condiff from the Noun Project */}
					<title>Correct</title>
					<path d="M35.651,66.642c0.512,0,1.024-0.195,1.414-0.585L50.5,52.621l13.435,13.436  c0.39,0.39,0.902,0.585,1.414,0.585s1.024-0.195,1.414-0.585c0.781-0.781,0.781-2.048,0-2.829L53.328,49.793l12.728-12.728  c0.781-0.781,0.781-2.048,0-2.829c-0.78-0.78-2.048-0.78-2.828,0L50.5,46.965L37.772,34.236c-0.78-0.78-2.048-0.78-2.828,0  c-0.781,0.781-0.781,2.048,0,2.829l12.728,12.728L34.237,63.228c-0.781,0.781-0.781,2.048,0,2.829  C34.627,66.447,35.139,66.642,35.651,66.642z" />
					<path d="M8,50c0,22.767,19.234,42,42,42s42-19.233,42-42S72.766,8,50,8S8,27.233,8,50z M50,12  c20.598,0,38,17.402,38,38S70.598,88,50,88S12,70.598,12,50S29.402,12,50,12z" />
				</svg>
			</button>
		}
	</div>
);

ReactDOM.render(
	<App />,
	document.getElementById('app')
);
