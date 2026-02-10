/* eslint-disable @typescript-eslint/no-explicit-any */
//  backend

/**
 * ====================================
 * 🧮 EXPRESSION EVALUATOR
 * ====================================
 * Safe expression evaluation for workflow conditions
 */

export type ExpressionResult = {
  success: boolean;
  result?: boolean;
  error?: string;
};

/**
 * Safely evaluate a JavaScript expression in a controlled context
 */
export function evaluateExpression(
  expression: string,
  context: any,
): ExpressionResult {
  try {
    // Build a safe evaluation function
    // We use Function constructor with controlled context
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    // Create the function with context variables as parameters
    const fn = new Function(
      ...contextKeys,
      `'use strict'; return (${expression});`,
    );

    // Execute with context values
    const result = fn(...contextValues);

    return {
      success: true,
      result: Boolean(result),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Expression evaluation failed",
    };
  }
}

/**
 * Validate expression syntax without executing it
 */
export function validateExpression(expression: string): {
  valid: boolean;
  error?: string;
} {
  try {
    // Try to create a function with the expression
    new Function(`return (${expression})`);
    return { valid: true };
  } catch (err: any) {
    return {
      valid: false,
      error: err.message || "Invalid expression syntax",
    };
  }
}

/**
 * Test an expression with mock context
 */
export function testExpression(
  expression: string,
  mockContext: any,
): ExpressionResult {
  return evaluateExpression(expression, mockContext);
}

/**
 * Build expression from fallback route condition
 * This is used by the workflow executor to evaluate routes
 */
export function buildRouteExpression(
  route: {
    condition: {
      field: string;
      operator: string;
      value: any;
    };
  },
  nodeId: string,
): string {
  const { field, operator, value } = route.condition;
  const leftSide = `step["${nodeId}"].${field}`;

  let operatorSymbol: string;
  switch (operator) {
    case "equals":
      operatorSymbol = "===";
      break;
    case "notEquals":
      operatorSymbol = "!==";
      break;
    case "greaterThan":
      operatorSymbol = ">";
      break;
    case "lessThan":
      operatorSymbol = "<";
      break;
    case "greaterOrEqual":
      operatorSymbol = ">=";
      break;
    case "lessOrEqual":
      operatorSymbol = "<=";
      break;
    case "contains":
      return `${leftSide} && ${leftSide}.toLowerCase().includes("${value}")`;
    case "exists":
      return `${leftSide} !== undefined && ${leftSide} !== null`;
    default:
      operatorSymbol = "===";
  }

  const rightSide = typeof value === "string" ? `"${value}"` : String(value);
  return `${leftSide} ${operatorSymbol} ${rightSide}`;
}

/**
 * Extract variable references from an expression
 */
export function extractVariables(expression: string): string[] {
  const variables: string[] = [];

  // Match step references: step["nodeId"].field or step.nodeId.field
  const stepMatches = expression.matchAll(
    /step(?:\["([^"]+)"\]|\.(\w+))\.(\w+)/g,
  );
  for (const match of stepMatches) {
    const nodeId = match[1] || match[2];
    const field = match[3];
    variables.push(`step.${nodeId}.${field}`);
  }

  // Match vars references: vars.variableName
  const varMatches = expression.matchAll(/vars\.(\w+)/g);
  for (const match of varMatches) {
    variables.push(`vars.${match[1]}`);
  }

  return [...new Set(variables)]; // Remove duplicates
}

/**
 * Check if expression references a specific node
 */
export function referencesNode(expression: string, nodeId: string): boolean {
  const pattern = new RegExp(`step(?:\\["${nodeId}"\\]|\.${nodeId})\\.`, "g");
  return pattern.test(expression);
}
