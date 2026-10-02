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
  while (['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression'].includes(node?.type)) {
    node = node.expression;
  }

  return node;
}

function isComponentExpression(expression) {
  const node = unwrap(expression);

  if (!node) return false;
  if (['ArrowFunctionExpression', 'FunctionExpression'].includes(node.type)) return true;

  return (
    node.type === 'CallExpression' &&
    (containsJsx(node) ||
      ['memo', 'forwardRef'].includes(node.callee?.name ?? node.callee?.property?.name))
  );
}

export function componentNames(program) {
  const names = [];

  walk(program, (node) => {
    if (node.type === 'FunctionDeclaration' && node.id && /^[A-Z]/.test(node.id.name)) {
      names.push(node.id.name);
    }

    if (node.type === 'ClassDeclaration' && node.id && containsJsx(node)) names.push(node.id.name);
    if (
      node.type === 'ExportDefaultDeclaration' &&
      !node.declaration.id &&
      isComponentExpression(node.declaration)
    )
      names.push('default');
    if (
      node.type === 'VariableDeclarator' &&
      /^[A-Z]/.test(node.id.name ?? '') &&
      isComponentExpression(node.init)
    )
      names.push(node.id.name);
  });
  return names;
}
