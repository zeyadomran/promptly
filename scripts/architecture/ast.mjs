export function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'comments' || key === 'tokens') continue;
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}

function containsJsx(node) {
  let found = false;

  walk(node, (child) => {
    if (child.type === 'JSXElement' || child.type === 'JSXFragment') found = true;
  });
  return found;
}

function unwrap(node) {
  while (
    [
      'TSAsExpression',
      'TSSatisfiesExpression',
      'TSNonNullExpression',
      'ParenthesizedExpression'
    ].includes(node?.type)
  ) {
    node = node.expression;
  }

  return node;
}

function isComponentClass(node, classNames) {
  if (!['ClassDeclaration', 'ClassExpression'].includes(node.type)) return false;

  return (
    containsJsx(node) || classNames.has(node.superClass?.name ?? node.superClass?.property?.name)
  );
}

function isComponentExpression(expression, classNames) {
  const node = unwrap(expression);

  if (!node) return false;
  if (['ArrowFunctionExpression', 'FunctionExpression'].includes(node.type)) return true;
  if (isComponentClass(node, classNames)) return true;

  return (
    node.type === 'CallExpression' &&
    (containsJsx(node) ||
      ['memo', 'forwardRef'].includes(node.callee?.name ?? node.callee?.property?.name))
  );
}

export function componentNames(program) {
  const names = [];
  const classNames = new Set(['Component', 'PureComponent']);

  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration' || statement.source.value !== 'react') continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type === 'ImportSpecifier' && classNames.has(specifier.imported.name)) {
        classNames.add(specifier.local.name);
      }
    }
  }

  walk(program, (node) => {
    if (node.type === 'FunctionDeclaration' && (!node.id || /^[A-Z]/.test(node.id.name))) {
      names.push(node.id?.name ?? 'default');
    }

    if (node.type === 'ClassDeclaration' && isComponentClass(node, classNames)) {
      names.push(node.id?.name ?? 'default');
    }

    if (
      node.type === 'ExportDefaultDeclaration' &&
      !node.declaration.id &&
      node.declaration.type !== 'ClassDeclaration' &&
      isComponentExpression(node.declaration, classNames)
    )
      names.push('default');
    if (
      node.type === 'VariableDeclarator' &&
      /^[A-Z]/.test(node.id.name ?? '') &&
      isComponentExpression(node.init, classNames)
    )
      names.push(node.id.name);
  });
  return names;
}
