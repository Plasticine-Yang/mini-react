import { EffectTag } from './constants'
import { createDOM, updateDOM } from './dom'
import { TEXT_ELEMENT_TYPE, createTextElement, isValidElement } from './element'
import { isDefined, isObject } from './helpers'

let nextUnitOfWork = null
let currentRoot = null
let wipRoot = null
let wipFiber = null
let hookIndex = 0
let deletions = []

const reconcileChildren = (fiberNode, children) => {
  const currentFiberNode = fiberNode.alternate
  const childrenCount = children.length
  const flatChildren = children.flat(Infinity)

  let index = 0
  let oldChildFiberNode = currentFiberNode?.child ?? null
  let prevSibling = null

  while (index < childrenCount) {
    const childElement = flatChildren.at(index)
    const isSameType = oldChildFiberNode && childElement && oldChildFiberNode.type === childElement.type

    let newChildFiberNode = null

    // diff
    if (isSameType) {
      // 可复用旧的 fiber 的 dom - 更新
      newChildFiberNode = {
        type: oldChildFiberNode.type,
        props: childElement.props,
        dom: oldChildFiberNode.dom,
        alternate: oldChildFiberNode,
        child: null,
        sibling: null,
        return: fiberNode,
        effectTag: EffectTag.Update,
      }
    } else {
      // 不可复用旧 fiber，但是新的 childElement 存在 - 新增
      if (childElement) {
        newChildFiberNode = {
          type: childElement.type,
          props: childElement.props,
          dom: null,
          alternate: null,
          child: null,
          sibling: null,
          return: fiberNode,
          effectTag: EffectTag.Replacement,
        }
      }

      // 不可复用旧的 fiber，且旧的 fiber 存在 - 移除
      if (oldChildFiberNode) {
        deletions.push(oldChildFiberNode)
      }
    }

    // 更新 fiber 之间的指向
    if (oldChildFiberNode) {
      oldChildFiberNode = oldChildFiberNode.sibling
    }

    if (index === 0) {
      // 首个 child 作为 fiber.child
      fiberNode.child = newChildFiberNode
    } else if (prevSibling !== null) {
      prevSibling.sibling = newChildFiberNode
    }

    prevSibling = newChildFiberNode
    index += 1
  }
}

const performUnitOfWork = (fiberNode) => {
  console.log('performUnitOfWork', fiberNode)

  const { type, props } = fiberNode
  const children = props.children

  switch (typeof type) {
    // host component
    case 'string': {
      if (fiberNode.dom === null) {
        fiberNode.dom = createDOM(fiberNode)
      }

      reconcileChildren(fiberNode, children)
      break
    }

    // composite component
    case 'function': {
      wipFiber = fiberNode
      hookIndex = 0

      const compositeComponentChildren = type(props)
      reconcileChildren(fiberNode, [
        isValidElement(compositeComponentChildren)
          ? compositeComponentChildren
          : createTextElement(String(compositeComponentChildren)),
      ])
      break
    }

    case 'symbol': {
      // text
      if (type === TEXT_ELEMENT_TYPE) {
        if (fiberNode.dom === null) {
          fiberNode.dom = createDOM(fiberNode)
        }
      }
      break
    }
  }

  // 优先遍历 child
  if (fiberNode.child) {
    return fiberNode.child
  }

  let nextFiberNode = fiberNode

  while (nextFiberNode !== null) {
    // 其次遍历 sibling
    if (nextFiberNode.sibling !== null) {
      return nextFiberNode.sibling
    }

    // 当前层的 sibling 都遍历完了，回到上层遍历上层的 sibling
    nextFiberNode = nextFiberNode.return
  }

  // 全都遍历完了，不存在下一个工作单元了
  return null
}

const findParentFiberNode = (fiberNode) => {
  if (fiberNode) {
    let parentFiberNode = fiberNode.return
    while (parentFiberNode && !parentFiberNode.dom) {
      parentFiberNode = parentFiberNode.return
    }

    return parentFiberNode
  }

  return null
}

const commitReplacement = (parentDOM, DOM) => {
  if (parentDOM) {
    console.log('commitReplacement', DOM)
    parentDOM.appendChild(DOM)
  }
}

const commitDeletion = (parentDOM, DOM) => {
  if (parentDOM) {
    console.log('commitDeletion')
    parentDOM.removeChild(DOM)
  }
}

const commitWork = (fiberNode) => {
  if (fiberNode) {
    if (fiberNode.dom) {
      const parentFiberNode = findParentFiberNode(fiberNode)
      const parentDOM = parentFiberNode?.dom

      console.log('commitWork', fiberNode, parentFiberNode, parentDOM)

      switch (fiberNode.effectTag) {
        case EffectTag.Replacement:
          commitReplacement(parentDOM, fiberNode.dom)
          break

        case EffectTag.Update:
          updateDOM(fiberNode.dom, fiberNode.alternate ? fiberNode.alternate.props : {}, fiberNode.props)
          break

        default:
          break
      }
    }

    commitWork(fiberNode.child)
    commitWork(fiberNode.sibling)
  }
}

const commitRoot = () => {
  for (const deletion of deletions) {
    const parentFiberNode = findParentFiberNode(deletion)
    commitDeletion(parentFiberNode?.dom, deletion.dom)
  }

  if (wipRoot !== null) {
    commitWork(wipRoot.child)
    currentRoot = wipRoot
  }

  wipRoot = null
}

export const useState = (initialState) => {
  const fiberNode = wipFiber
  const hook = fiberNode?.alternate?.hooks
    ? fiberNode.alternate.hooks[hookIndex]
    : {
        state: initialState,
        queue: [],
      }

  // 每次组件渲染时会重新执行 useState，此时需要更新 hook 状态，保证 setState 拿到的是新状态
  while (hook.queue.length) {
    let resolvedState = hook.queue.shift()

    if (isObject(hook.state) && isObject(resolvedState)) {
      resolvedState = { ...hook.state, ...resolvedState }
    }

    if (resolvedState !== undefined) {
      hook.state = resolvedState
    }
  }

  if (fiberNode.hooks === undefined) {
    fiberNode.hooks = []
  }

  fiberNode.hooks.push(hook)
  hookIndex += 1

  const setState = (nextState) => {
    hook.queue.push(nextState)
    if (currentRoot) {
      wipRoot = {
        type: currentRoot.type,
        dom: currentRoot.dom,
        props: currentRoot.props,
        alternate: currentRoot,
      }
      nextUnitOfWork = wipRoot
      deletions = []
      // 重置为 null 防止多次一次执行上下文中多次调用 setState 时重复更新 wipRoot
      currentRoot = null
    }
  }

  return [hook.state, setState]
}

export const workLoop = (deadline) => {
  while (isDefined(nextUnitOfWork) && deadline.timeRemaining() > 1) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }

  if (!isDefined(nextUnitOfWork) && wipRoot) {
    commitRoot()
  }

  window.requestIdleCallback(workLoop)
}

export const render = (reactElement, container) => {
  currentRoot = null
  wipRoot = {
    type: 'div',
    dom: container,
    props: {
      children: [reactElement],
    },
    alternate: currentRoot,
    child: null,
    sibling: null,
    return: null,
  }
  nextUnitOfWork = wipRoot
}
