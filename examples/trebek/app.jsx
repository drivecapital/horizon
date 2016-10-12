'use strict';

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

		// Subscribe to Horizon collections
		this.questions = horizon('questions');

		// Set initial state
		this.state = {
			categories: [],
			questionsById: {},
			selected: null
		};

		// Bind event handlers
		this.handleSelect = this.handleSelect.bind(this);
	}

	componentDidMount() {
		this.fetchQuestions();
	}

	componentWillUnmount() {
		this.willUnmount = true;
		this.questions.disconnect();
	}

	async fetchAllQuestions() {
		return await (await fetch('/questions.json')).json();
	}

	fetchAskedQuestions() {
		return new Promise((resolve, reject) => {
			this.questions
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
			console.log(askedQuestions);
			const selected = askedQuestions.length >= 1 ? askedQuestions[0].id : null;

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
				questionsById,
				selected
			});
		}
	}

	handleSelect(id) {
		const question = this.state.questionsById[id];

		if (!question.asked) {
			// Select the question, and remember that it has been asked
			this.setState({
				questionsById: {
					...this.state.questionsById,
					[id]: {
						...question,
						asked: true
					}
				},
				selected: id
			});
			this.questions.store({
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
				{this.state.selected &&
					<Question
						{...this.state.questionsById[this.state.selected]}
						key={this.state.selected}
					/>
				}
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
		{asked ? '' : '100'}
	</td>
);

// Display a question, optionally display the answer, show submissions
class Question extends React.Component {

	constructor() {
		super();

		// Set initial state
		this.state = {
			reveal: false
		};

		// Bind event handlers
		this.handleToggleAnswer = this.handleToggleAnswer.bind(this);
	}

	handleToggleAnswer() {
		this.setState({
			reveal: !this.state.reveal
		});
	}

	render() {
		return (
			<div className="Question">
				<p>{this.props.category}</p>
				<p>{this.props.question}</p>
				{this.state.reveal ? (
					<p>{this.props.answer}</p>
				) : (
					<button onClick={this.handleToggleAnswer}>
						Show answer
					</button>
				)}
				{/* <Answers questionId={this.props.id} />*/}
			</div>
		);
	}

}

ReactDOM.render(
	<App />,
	document.getElementById('app')
);
