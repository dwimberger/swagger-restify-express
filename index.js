var swagger       = require('swagger-doc'),
    restify       = require('restify'),
    express       = require('express'),
    filePath      = require('path'),
    docs,
    ignoreList    = [
                      '/resources.json', 
    	              '/index\.html|\/css\/?.*|\/lib\/?.*|\/images\/?.*|\.js/'
		    ],
    pathAndParams = {"GET":[],"POST":[],"PUT":[],"DELETE":[],"HEAD":[]},
    swaggerParamsFromServer = {};

function getServerName(serverName) {
    var serverLib = swaggerParamsFromServer.server || 'restify';
    return ((serverLib + '') === serverName)
}

function getHttpPathArray(serverObj) {
    var routesList = [];    

    if (getServerName('restify')) {
	routesList =  serverObj.router.routes
    } else {
	routesList = serverObj.routes
    }

    return routesList
}

function getHttpPathFromPathAry(httpPathAry, httpMethod, id) {
    var strPath   = '';

    if (getServerName('restify')) {
	strPath =  httpPathAry[httpMethod][id].spec.path + ''
    } else {
	strPath = httpPathAry[httpMethod.toLowerCase()][id].path + ''
    }
    
    return strPath
}

function getLengthOfHttpPathsFromPathAry(httpPathAry, httpMethod) {
    if (getServerName('restify')) {
	return httpPathAry[httpMethod].length
    } else {
	return httpPathAry[httpMethod.toLowerCase()].length
    }
}

function addToSwaggerDocs(httpMethod, docs, serverObj) {
    var httpMethod  = httpMethod || 'GET',
        httpPathAry = getHttpPathArray(serverObj),
        hLength     = getLengthOfHttpPathsFromPathAry(httpPathAry, httpMethod),
        path        = '',
        paramsObj;

    for (var idx = 0; idx < hLength; idx++) {
            path = getHttpPathFromPathAry(httpPathAry, httpMethod, idx)
	    if (inIgnoreList(path, ignoreList) === false) {
                paramsObj = generateParamsForSwagger(httpMethod, path) 
                pathAndParams[httpMethod].push(paramsObj)		
		addRestOptionsToDoc(httpMethod, paramsObj.path, docs)
	    }
    }

}

function addRestOptionsToDoc(httpMethod, restPath, docs) {
    if (httpMethod === 'GET') {
	docs.get(restPath, restPath, {notes: restPath, nickname: restPath, parameters: getParametersForThePath('GET', restPath)})	
    } else if (httpMethod === 'POST') {
	docs.post(restPath, restPath, {notes: restPath, nickname: restPath, parameters: getParametersForThePath('POST', restPath)})
    }
}

function getParametersForThePath(httpMethod, restPath) {
    var parameters = [];

    pathAndParams[httpMethod].map(function(val, idx, ary) {
	if (val.path === restPath) {
	    parameters = val.parameters
	}
    })

    return parameters
}

function inIgnoreList(path, ignoreList) {
    var found    = false,
        igLength = ignoreList.length,
        httpPath = path;

    for (var idx = 0; idx < igLength; idx++) {
    	if ((httpPath === ignoreList[idx]) || (httpPath.replace(/\\/g,"") === ignoreList[idx])) {  // unescape is handled
    	    found = true
    	    break
    	}
    }

    return found
}

function generateParamsForSwagger(httpMethod, path) {
    var reg = /:(.+?)\b/g,
        replacedStr = '',
        parameters = [];

    replacedStr = path.replace(reg, function(str) { 
        str = str.replace(/:/g, "")
    	parameters.push({name: str, description: str + " of path", required:true, dataType: "string", paramType: "path"})
    	return "{" + str + "}" 
    	})
   
    return {'path' : replacedStr, 'parameters' : parameters}
}

function extendObject(object, inheritFromObj) {
    for (i in inheritFromObj) {
	object[i] = inheritFromObj[i]
    }
    return object
}

function bootStrap(serverObj) {

    if (getServerName('express')) {
	serverObj.use(express.static(swaggerParamsFromServer.staticResourceFolder))
        serverObj.get('/index.html', function(req, res) {
	    res.sendfile(swaggerParamsFromServer.staticResourceFolder + '/index.html')
	})
        ignoreList.push('/index.html')
    } else {
	serverObj.get(/index\.html|\/css\/?.*|\/lib\/?.*|\/images\/?.*|\.js/, restify.serveStatic({
	    'directory': './node_modules/swagger-ui/dist',
	    'default': 'index.html'
	}))	
    }
    
}

exports.getParametersForThePath = getParametersForThePath
exports.generateParamsForSwagger = generateParamsForSwagger
exports.inIgnoreList = inIgnoreList

exports.init = function(serverObj, swaggerParams) {

    swaggerParamsFromServer =  extendObject(swaggerParamsFromServer, swaggerParams)
    bootStrap(serverObj)
    
    swagger.configure(serverObj, {
	version: "0.1"
    })

    docs = swagger.createResource("/" + swaggerParams.resourceName)
    ignoreList.push("/" + swaggerParams.resourceName)

    addToSwaggerDocs('GET', docs, serverObj)
    addToSwaggerDocs('POST', docs, serverObj)

    console.log(JSON.stringify(pathAndParams));

}


