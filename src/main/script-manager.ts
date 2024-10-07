import vm from "vm";
import ts from "typescript";

/** used to transcompile and run scripts */
export class ScriptManager {
  /** transpiles given typescript to javascript */
  public transpile(tsCode: string): ts.TranspileOutput {
    const result = ts.transpileModule(tsCode, { compilerOptions: { module: ts.ModuleKind.CommonJS, allowJs: true } });
    return result;
  }

  /** transpiles and executes given typescript code */
  public execute(tsCode: string) {
    // transpile
    const jsCode = this.transpile(tsCode).outputText;

    // create context
    let context = this.createContext();

    // execute
    try {
      vm.runInContext(jsCode, context);
    } catch (error) {
      console.error("Error executing user script:", error);
      throw error;
    }
  }

  /** creates a new script-execution vm context */
  private createContext() {

    const context: typeof ScriptContractV1 = {
      multiply: (a, b) => a *b,
      getUserDetails: (userId) => {
        return {
          age: 12,
          name: "jo"
        }
      },
      x: "Test"
    }
    return vm.createContext(context);
  }
}

export interface ContextItem {
    name: string;
    summary: string;
    item: any;
}


