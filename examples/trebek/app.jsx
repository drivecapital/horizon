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
			questionsById: {}
		};

		// Bind event handlers
		this.handleSelect = this.handleSelect.bind(this);
	}

	componentDidMount() {
		this.fetchQuestions();
	}

	componentWillUnmount() {
		this.willUnmount = true;
	}

	async fetchAllQuestions() {
		return await (await fetch('/questions.json')).json();
	}

	fetchAskedQuestions() {
		return new Promise((resolve, reject) => {
			horizon('questions')
				.order('timestamp', 'descending')
				.fetch()
				.subscribe(resolve, reject);
		});
	}

	async fetchQuestions() {
		const [allQuestions, askedQuestions] = await Promise.all([
			this.fetchAllQuestions(),
			this.fetchAskedQuestions()
		]);

		if (!this.willUnmount) {
			const askedQuestionIds = new Set(askedQuestions.map(({ id }) => id));
			const questionsById = {};
			const categories = allQuestions.map((category) => ({
				name: category.name,
				questions: category.questions.map((question) => {
					questionsById[question.id] = {
						...question,
						asked: askedQuestionIds.has(question.id),
						category: category.name
					};
					return question.id;
				})
			}));

			this.setState({
				categories,
				questionsById
			});
		}
	}

	handleSelect(id) {
		const question = this.state.questionsById[id];

		if (!question.asked) {
			this.setState({
				questionsById: {
					...this.state.questionsById,
					[id]: {
						...question,
						asked: true
					}
				}
			});
			horizon('questions').store({
				id: question.id,
				category: question.category,
				question: question.question,
				timestamp: new Date()
			});
		}
	}

	render() {
		return (
			<div className="App">
				<Board
					categories={this.state.categories}
					onSelect={this.handleSelect}
					questionsById={this.state.questionsById}
				/>
				<Scores />
				<Question questionsById={this.state.questionsById} />
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

const Cells = ({ categories, questionsById, ...props }) => {
	// HTML tables are row-based, so transpose the column-based categories
	const rows = [];
	const height = Math.max(...categories.map(({ questions }) => questions.length));
	for (let i = 0; i < height; i++) {
		rows.push(categories.map(({ questions }) => questions[i]));
	}

	return (
		<tbody>
			{rows.map((row, i) => (
				<tr key={i}>
					{row.map((qid) => (
						<Cell
							{...props}
							{...questionsById[qid]}
							key={qid}
						/>
					))}
				</tr>
			))}
		</tbody>
	);
};

const Cell = ({ asked, id, onSelect, question }) => (
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

// Display a question, optionally display the answer, show submissions
class Question extends React.Component {

	constructor() {
		super();

		// Set initial state
		this.state = {
			question: null,
			reveal: false
		};

		// Bind event handlers
		this.handleToggleAnswer = this.handleToggleAnswer.bind(this);
	}

	componentDidMount() {
		this.questions = horizon('questions')
			.order('timestamp', 'descending')
			.limit(1)
			.watch()
			.subscribe(([question]) => {
				this.setState({
					question,
					reveal: false
				});
			});
	}

	componentWillUnmount() {
		this.questions.unsubscribe();
	}

	handleToggleAnswer() {
		this.setState({
			reveal: !this.state.reveal
		});
	}

	render() {
		if (!this.state.question) return null;

		const question = {
			...this.state.question,
			...this.props.questionsById[this.state.question.id]
		};
		return (
			<div className="Question">
				<p>{question.category}</p>
				<p>{question.question}</p>
				{this.state.reveal ? (
					<p>{question.answer}</p>
				) : (
					<button onClick={this.handleToggleAnswer}>
						Show answer
					</button>
				)}
				<Answers key={question.id} questionId={question.id} />
			</div>
		);
	}

}

class Answers extends React.Component {

	constructor() {
		super();

		// Set initial state
		this.state = {
			answers: [],
			answersById: {},
			scored: {}
		};

		// Bind event handlers
		this.handleCorrect = this.handleCorrect.bind(this);
		this.handleIncorrect = this.handleIncorrect.bind(this);
	}

	componentDidMount() {
		this.answers = horizon('answers')
			.findAll({ questionId: this.props.questionId })
			.order('timestamp', 'ascending')
			.watch()
			.subscribe((answers) => {
				this.setState({
					answers: answers.map(pick('id')),
					answersById: mapify('id', answers),
				 });
			});
		this.scores = horizon('scores')
			.watch()
			.subscribe((scores) => {
				this.setState({
					scored: mapify('answerId', scores)
				});
			});
	}

	componentWillUnmount() {
		this.answers.unsubscribe();
		this.scores.unsubscribe();
	}

	handleCorrect(id) {
		horizon('scores')
			.store({
				answerId: id,
				points: 100,
				questionId: this.props.questionId,
				userId: this.state.answersById[id].userId
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
				answerId: id,
				points: -100,
				questionId: this.props.questionId,
				userId: this.state.answersById[id].userId
			});
	}

	render() {
		const answeredUsers = new Set();
		const allAnswers = this.state.answers
			.map((id) => this.state.answersById[id])
			// Only let users submit one answer each
			.filter(({ userId }) => {
				if (answeredUsers.has(userId)) {
					return false;
				} else {
					answeredUsers.add(userId);
					return true;
				}
			});
		const [scoredAnswers, unscoredAnswers] = split(
			({ id }) => this.state.scored.hasOwnProperty(id),
			allAnswers
		);

		return (
			<ol className="Answers">
				{scoredAnswers.map((answer) =>
					<Answer {...answer} key={answer.id} />
				)}
				{unscoredAnswers.slice(0, 1).map((answer) =>
					<Answer
						{...answer}
						key={answer.id}
						onCorrect={this.handleCorrect}
						onIncorrect={this.handleIncorrect}
					/>
				)}
			</ol>
		);
	}

}

const Answer = ({ answer, id, onCorrect, onIncorrect, userId }) => (
	<li className="Answer">
		<span className="Answer-user">{userId}</span>
		<span className="Answer-text">{answer}</span>
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
