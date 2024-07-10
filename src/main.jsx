import MiniReact from './mini-react'

const root = document.querySelector('#root')

const Counter = (props) => {
  const { className, children } = props

  const [count, setCount] = MiniReact.useState(0)

  console.log('render Counter', count);

  const onClick = () => {
    setCount(count + 1)
  }

  return MiniReact.createElement('div', { className, onClick }, [
    `count: ${count}`,
    MiniReact.createElement('div', {}, ['children: ', children]),
  ])
}

MiniReact.render(
  MiniReact.createElement('div', { id: 'foo' }, [
    'Foo',
    MiniReact.createElement('span', { className: 'bar' }, ['Bar']),
    MiniReact.createElement(
      Counter,
      {
        className: 'counter',
      },
      ['Counter Children'],
    ),
  ]),
  root,
)
