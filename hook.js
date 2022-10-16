Java.perform(function() {
    console.log("start");

    packet_logging();
})


function packet_logging(){
    let log_index = 0;

    function createInterceptor(){
        const Interceptor = Java.use("okhttp3.Interceptor");
        const MyInterceptor = Java.registerClass({
            name : "okhttp3.MyInterceptor",
            implements : [Interceptor],
            methods : {
                intercept: function(chain){
                    let request = chain.request();
                    let response = chain.proceed(request);

                    printPacket(request, response);

                    return response;
                }
            }
        })

        var MyInterceptorObj = MyInterceptor.$new();
        var Builder = Java.use("okhttp3.OkHttpClient$Builder");
        
        Builder.build.implementation = function() {
            this.addNetworkInterceptor(MyInterceptorObj);
            return this.build();
        };
    }

    function request_pretty(request){
        const method = request.method();
        const headers = request.headers();
        const request_body = request.body();
        const url = request.url();
        let request_body_str = "";

        if(request_body){
            // ref: https://github.com/frida/frida/issues/1493
            const buffer = Java.use('okio.Buffer');
            const bufferInstance = buffer.$new(); 
            request_body.writeTo(bufferInstance); 
            
            request_body_str = bufferInstance.readUtf8();
        }
        
        // TODO print cookie
        return `${method} ${url}\r\n${headers}\r\n${request_body_str}`;
    }

    function response_pretty(response){
        const status_code = response.code();
        const headers = response.headers();
        const message = response.message();
        const protocol = response.protocol().toString().toUpperCase();
        const response_body = response.body();
        let response_body_str = "";

        if(response_body && response_body.contentLength() != -1){
            const new_response_body = response.peekBody(100000);
            response_body_str = new_response_body.string();
        }

        // TODO print cookie
        return `${protocol} ${status_code} ${message}\r\n${headers}\r\n${response_body_str}`;
    }

    function printPacket(request, response){
        let result = "";
        log_index++;

        result  = `================ ${log_index} ================\n`;
        result += request_pretty(request);
        result += "\n\n\n";
        result += response_pretty(response);
        result += `\n================ ${log_index} ================\n\n\n\n`;

        console.log(result)
    }


    createInterceptor();
}
