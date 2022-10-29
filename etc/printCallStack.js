let call_stack_index = 0;

function printCallStack(){
    call_stack_index++;

    var ThreadDef = Java.use('java.lang.Thread');
    var ThreadObj = ThreadDef.$new();
    
    console.log("-------------------------------------");
    var stack = ThreadObj.currentThread().getStackTrace();
    for (var i = 0; i < stack.length; i++) {
        console.log(`[${call_stack_index}]` + " => " + stack[i].toString());
    }
    console.log("-------------------------------------");
}