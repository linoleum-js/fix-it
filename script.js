// Here's a working example https://jsfiddle.net/my8g6ujx/7/

// I'd rather use a react context instead of making the store global
const StoreContext = React.createContext();

// Why not to use createStore, connect etc. from 'redux' and 'react-redux'
// packages? If the intent was to keep the app without dependencies -- then
// it's ok. Otherwise -- naaah... 
const createStore = (reducer, initialState) => {
  let currentState = initialState
  let listeners = []

  const getState = () => currentState
  const dispatch = action => {
    currentState = reducer(currentState, action)
    listeners.forEach(listener => listener())
  }

  const subscribe = listener => listeners.push(listener)
  // I would add an unsubscribe method, because in the current
  // implementation listneres are always here, so even if a component got
  // unmounted it still will react to store changes.
  // It also can cause memory leaks.
	const unsubscribe = listener => {
  	listeners = listeners.filter(item => item !== listener)
  }
	
  return { getState, dispatch, subscribe, unsubscribe }
}

const connect = (mapStateToProps, mapDispatchToProps) =>
  Component => {
    return class extends React.Component {
    	static contextType = StoreContext;
      
      state = {
      	store: this.context
      }
      
      render() {
      	const { store } = this.state;
        return (
          <Component
            {...mapStateToProps(store.getState(), this.props)}
            {...mapDispatchToProps(store.dispatch, this.props)}
            // We have to pass props to the child component
            {...this.props}
          />
        )
      }

      componentDidMount() {
        this.context.subscribe(this.handleChange)
      }
      
     	componentWillUnmount() {
        this.context.unsubscribe(this.handleChange);
      }
      
      handleChange = () => {
        // Just want to get rid of forceUpdate. Also I believe that redux
        // works the same way.
        this.setState({ store: this.context });
      }
    }
  }

class Provider extends React.Component {
  render() {
		// A context instead of a global store
    return <StoreContext.Provider value={this.props.store}>
      {this.props.children}
    </StoreContext.Provider>
  }
}

// APP

// actions
const ADD_TODO = 'ADD_TODO'

// action creators
const addTodo = todo => ({
  type: ADD_TODO,
  payload: todo,
})

// reducers
const reducer = (state = [], action) => {
  switch(action.type) {
    case ADD_TODO:
      // Instead of modifying an existing state object we better
      // return a new one
      return [...state, action.payload]
    default:
      return state
  }
}

// components
// Someone will argue that it would better to refactor this component
// and make it a pure functional component by moving the updateText and
// addTodo methonds to the ToDo component, but I'm not a huge fan of
// this approach until it actually helps with reusability. I'd rather keep
// all parts of a component in one place so it's easier to read and work with.
class ToDoComponent extends React.Component {
  state = {
    todoText: ''
  }

  render() {
    return (
      <div>
        <label>{this.props.title || 'Без названия'}</label>
        <div>
          <input
            value={this.state.todoText}
            placeholder="Название задачи"
            onChange={this.updateText}
          />
          <button
            onClick={this.addTodo}
            // I guess we don't want to add empty items
            disabled={!this.state.todoText}
          >Добавить</button>
          <ul>
            {this.props.todos.map((todo, idx) => {
              // You have add a key prop to list items.
              // Though an index is not the best solution, and it better be
              // an id or something like that, since this is all we have --
              // it's better than nothing.
            	return <li key={idx}>{todo}</li>
            })}
          </ul>
        </div>
      </div>
    )
  }

  // Since we pass these methods a callbacks we better use
  // arrow functions because they keep their context.
  // Otherwise we have to use .bind (please don't)
  updateText = (e) => {
    const { value } = e.target
		
    // You shouldn't access a components state that way,
    // use setState instead
    this.setState({ todoText: value });
  }

  addTodo = () => {
    this.props.addTodo(this.state.todoText)
		
    // The same as in updateText
    this.setState({ todoText: '' });
  }
}


// These two are fine
const ToDo = connect(state => ({
  todos: state,
}), dispatch => ({
  addTodo: text => dispatch(addTodo(text)),
}))(ToDoComponent)

// init
ReactDOM.render(
  <Provider store={createStore(reducer, [])}>
    <ToDo title="Список задач"/>
  </Provider>,
  document.getElementById('app')
)