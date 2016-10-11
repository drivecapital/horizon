'use strict';

const horizon = Horizon({
	authType: {
		token: window.authToken,
		storeLocally: false
	}
});

class App extends React.Component {

	constructor() {
		super();

		// Subscribe to Horizon collections
		this.answers = horizon('answers');
		this.questions = horizon('questions');
		this.scores = horizon('scores');

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

	async fetchQuestions() {
		const response = await fetch('/questions.json');
		const data = await response.json();

		if (!this.willUnmount) {
			const questionsById = {};
			const categories = data.map((category) => ({
				name: category.name,
				questions: category.questions.map((question) => {
					questionsById[question.id] = {
						...question,
						asked: false
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
		this.setState({
			questionsById: {
				...this.state.questionsById,
				[id]: {
					...this.state.questionsById[id],
					asked: true
				}
			}
		});
	}

	render() {
		return (
			<div className="App">
				<Board
					categories={this.state.categories}
					onSelect={this.handleSelect}
					questionsById={this.state.questionsById}
				/>
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
		{asked ? question : '?'}
	</td>
);

ReactDOM.render(
	<App />,
	document.getElementById('app')
);
