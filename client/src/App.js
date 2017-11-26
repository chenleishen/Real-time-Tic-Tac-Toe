import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import io from "socket.io-client";
import * as uuidv1 from 'uuid/v1';

let getUserSocket;
let gameSocket;

class App extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Tic Tac Toe</h1>
        </header>
        <Main />
      </div>
    );
  }
}

class Main extends Component {
  constructor(props) {
    super(props);

    this.state = {
      enterName : true,
      start: false,
      game: false,
      ownerId : uuidv1(),
      players : []
    };
  }

  updatePlayers(players) {
    this.setState({ players : players });
  }

  handleStartClick(name) {

    getUserSocket = io('/getUser');

    getUserSocket.emit('userConnected',
      { id: this.state.ownerId,
        name: name });

    getUserSocket.on('userConnected', this.updatePlayers.bind(this));

    getUserSocket.on('userDisconnected', this.updatePlayers.bind(this));

    getUserSocket.on('connect_error', (error) => {
      console.log('connect_error');
      console.log(error);
    });

    getUserSocket.on('connect_timeout', (timeout) => {
      console.log('connect_timeout');
      console.log(timeout);
    });

    getUserSocket.on('error', (error) => {
      console.log('connect_error');
      console.log(error);
    });

    getUserSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('reconnect attempt');
      console.log(attemptNumber);
    });

    getUserSocket.on('challenged', (pair) => {
      console.log('challenged');
      console.log(pair);
      this.setState({
        enterName : false,
        start: false,
        game: true,
        pair : pair,
        challenged : true
      });
    });

    this.setState({
      enterName : false,
      start: true,
      game: false
    });
  }

  handleOppponentClick(player) {
    let pair = {
      owner : this.getOWner(),
      opponent : player
    };

    getUserSocket.emit('opponentSelected', pair);

    this.setState({
      enterName : false,
      start: false,
      game: true,
      pair: pair,
      challenged : false
    });
  }

  getOWner () {
    return this.state.players.find(player => player.id === this.state.ownerId);
  }

  render() {
    if (this.state.enterName) {
      return (
        <div>
          <EnterName onClick = { (name) => this.handleStartClick(name) } />
        </div>
      );
    } else if (this.state.start) {
      return (
        <div>
          <Start players = { this.state.players }
                 onClick = { (player) => this.handleOppponentClick(player) }
                 ownerId = { this.state.ownerId }
          />
        </div>
      );
    } else {
      return (
        <div>
          <Game challenged = { this.state.challenged }
                pair = { this.state.pair } />
        </div>
      );
    }
  }
}

class EnterName extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value : 'anonymous'
    };

    this.handleChange = this.handleChange.bind(this);
  }
  render() {
    return (
      <div>
        <h3>Pick Your Nickname</h3>
        <div>
          <input type="text"
                 value={this.state.value}
                 onChange={this.handleChange}
          />
        </div>
        <div>
          <button onClick={() => this.props.onClick(this.state.value)}>
            START
          </button>
        </div>
      </div>
    );
  }

  handleChange(event) {
    this.setState({value: event.target.value});
  }
}

class Start extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const players = this.props.players;

    let selectPlayers = "no other players online";

    if (players.length > 0) {
      selectPlayers = players.map((player) => {
        return (
          <li key = { player.id } >
            <button
              onClick={() => this.props.onClick(player)}
              disabled={ this.props.ownerId === player.id }>
              {player.name}
              </button>
          </li>
        );
      });
    }

    return (
      <div>
        <h3>Select Your Opponent</h3>
        <div>
          <ul>{selectPlayers}</ul>
        </div>
      </div>
    );
  }
}

function Square(props) {
  return (
    <button className="square"
            onClick={props.onClick}
            disabled={props.disabled}>
      {props.value}
    </button>
  );
}

class Board extends React.Component {

  renderSquare(i) {
    return (
      <Square
        disabled = {this.props.disabled}
        value={this.props.squares[i]}
        onClick={() => this.props.onClick(i)}
      />
    );
  }

  render() {
    return (
      <div>
        <div className="board-row">
          {this.renderSquare(0)}
          {this.renderSquare(1)}
          {this.renderSquare(2)}
        </div>
        <div className="board-row">
          {this.renderSquare(3)}
          {this.renderSquare(4)}
          {this.renderSquare(5)}
        </div>
        <div className="board-row">
          {this.renderSquare(6)}
          {this.renderSquare(7)}
          {this.renderSquare(8)}
        </div>
      </div>
    );
  }
}

class Game extends React.Component {
  constructor(props) {
    super(props);

    gameSocket = io('/game');

    gameSocket.emit('userConnected', this.getRoomId());

    gameSocket.on('move', (updatedState) => {
      this.setState(updatedState);
    });

    this.state = {
      history: [{
        squares: Array(9).fill(null),
      }],
      opponentIsNext: true,
      stepNumber: 0,
      msg : this.getMsg()
    };
  }

  getMsg() {
    const challenged = this.props.challenged;
    const opponent = this.props.pair.opponent.name;
    const owner = this.props.pair.owner.name;

    if(typeof(challenged) === "boolean" && challenged){
      return opponent + ', ' + owner + ' challenged you';
    } else if (typeof(challenged) === "boolean" && !challenged) {
      return owner + ', you challenged ' + opponent;
    } else {
      throw Error('challenged is not defined');
    }
  }

  getRoomId() {
    return this.props.pair.owner.id;
  }

  handleClick(i) {
    const history = this.state.history.slice();
    const current = history[history.length - 1];
    const squares = current.squares.slice();
    const opponent = 'X';
    const owner = 'O';

    if (calculateWinner(squares) || squares[i]) {
      return;
    }

    let updatedState = {
      history: history.concat([{
        squares: squares,
      }]),
      stepNumber: history.length,
      opponentIsNext: !this.state.opponentIsNext,
    };

    squares[i] = this.state.opponentIsNext ? opponent : owner;
    gameSocket.emit('move', {
      roomId : this.getRoomId(),
      updatedState : updatedState
    });

    this.setState(updatedState);
  }

  jumpTo(step) {
    this.setState({
      stepNumber: step,
      opponentIsNext: (step % 2) === 0,
    });
  }

  render() {
    const history = this.state.history;
    const current = history[this.state.stepNumber];
    const winner = calculateWinner(history[history.length - 1].squares);
    const finished = isFinished(history[history.length - 1].squares);

    const isDisabled = this.props.challenged ?
      !this.state.opponentIsNext : this.state.opponentIsNext;

    const owner = this.props.pair.owner;
    const opponent = this.props.pair.opponent;

    //move is index
    let historyTitle = 'History';
    let moves = history.map((step, move) => {
      const desc = move ?
        'Go to move #' + move :
        'Go to game start';
      return (
        <li key={move}>
          <button onClick={() => this.jumpTo(move)}>{desc}</button>
        </li>
      );
    });

    let status;
    if (winner) {
      status = 'Winner: ' + winner;
    } else if (finished) {
      status = 'Tied';
    } else {
      status = 'Next player: ' +
        (this.state.opponentIsNext ?
          opponent.name + ' (X)' : owner.name + ' (O)');
      historyTitle = '';
      moves = [];
    }

    return (
      <div className="game">
        <h3>{ this.state.msg }</h3>
        <div className="game-board">
          <Board
            disabled={ isDisabled }
            squares={ current.squares }
            onClick={ (i) => this.handleClick(i) }
          />
        </div>
        <div className="game-info">
          <h3> Status </h3>
          <div>{ status }</div>
          <h3>{ historyTitle }</h3>
          <ul>{ moves }</ul>
        </div>
      </div>
    );
  }
}

function isFinished(squares) {
  const nullVals = squares.filter(square => square === null);
  return nullVals.length === 0;
}

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}

export default App;
