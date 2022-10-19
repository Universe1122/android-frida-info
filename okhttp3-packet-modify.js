
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

                    // Modify GET Parameter
                    request = changeRequestGET(request, {"test" : "1", "test2" : "adsf"});

                    // Or Modify Request Body
                    // request = changeRequestBody(request, {"SM-A750N" : "SM-A750M"})

                    let response = chain.proceed(request);

                    // Print request, response packet
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
        const header_str = getHeaderInfo(headers);
        let request_body_str = "";

        if(request_body){
            // ref: https://github.com/frida/frida/issues/1493
            const buffer = Java.use('okio.Buffer');
            const bufferInstance = buffer.$new(); 
            request_body.writeTo(bufferInstance); 
            
            request_body_str = bufferInstance.readUtf8();
        }
        
        return `${method} ${url}\r\n${header_str}\r\n${request_body_str}`;
    }

    function response_pretty(response){
        const status_code = response.code();
        const headers = response.headers();
        const message = response.message();
        const protocol = response.protocol().toString().toUpperCase();
        const response_body = response.body();
        const header_str = getHeaderInfo(headers);
        let response_body_str = "";

        if(response_body && response_body.contentLength() != -1){
            const new_response_body = response.peekBody(100000);
            response_body_str = new_response_body.string();
        }

        return `${protocol} ${status_code} ${message}\r\n${header_str}\r\n${response_body_str}`;
    }

    function getHeaderInfo(header){
        let iterator = header.names().iterator();
        let header_str = "";

        while(iterator.hasNext()){
            let key = iterator.next().toString();
            let value = header.toMultimap().get(key).toString();

            value = value.substr(1);
            value = value.substr(0, value.length - 1);

            header_str += `${key}: ${value}\r\n`;
        }

        return header_str;
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


function changeRequestGET(request, dict = {}){
    let key = Object.keys(dict);
    let httpUrl$Builder = request.url().newBuilder();

    for(let k of key){
        httpUrl$Builder = httpUrl$Builder.setQueryParameter(k, dict[k]);
    }

    return request.newBuilder()
                    .url(httpUrl$Builder.build())
                    .build();
}

function changeRequestBody(request, dict = {}){
    let key = Object.keys(dict);
    let request_body = request.body();

    if(!request_body){
       return request; 
    }

    const method = request.method().toLowerCase();
    const content_type = request_body.contentType();
    const buffer = Java.use('okio.Buffer');
    const bufferInstance = buffer.$new(); 
    request_body.writeTo(bufferInstance); 
    let request_body_str = bufferInstance.readUtf8();

    for(let k of key){
        request_body_str = request_body_str.replace(k, dict[k]);
    }

    if(method == "post"){
        const new_request_body = request_body.create(content_type, request_body_str);
        request = request.newBuilder().post(new_request_body).build();
    }
    else if(method == "put"){
        const new_request_body = request_body.create(content_type, request_body_str);
        request = request.newBuilder().put(new_request_body).build();
    }
    else if(method == "patch"){
        const new_request_body = request_body.create(content_type, request_body_str);
        request = request.newBuilder().patch(new_request_body).build();
    }

    return request;
}