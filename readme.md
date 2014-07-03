Use this module if you want to make a server-side service for [noddity.com](Noddity) blogs.  It handles the going out and fetching of posts and the index, and leaves your code to turn parse that however it wills.

The idea is to have a node.js server running out on the internet that you can link to from your Noddity site, running on static file hosting somewhere else, anv have the node server able to respond dynamically to requests, based on the data in the relevant Noddity store.

The server always requires that noddityRoot and postUrlRoot parameters be passed in via the url.  It uses those to rustle up a [Noddity Butler](https://github.com/TehShrike/noddity-butler) (which it will cache) for your service to use to reference the posts and stuff.

Here's an example URL that fires up the [rssaas] Noddity service on one of my servers:

	http://rss.noddityaas.com/?noddityRoot=http://joshduff.com/content/&postUrlRoot=http://joshduff.com/%23!/post/&title=Josh%20Duff%20.com&author=Josh

The `noddityRoot` and `postUrlRoot` parameters are there, as the server requires, and the rest of the arguments are there for the benefit of the rssaas service.

This server exports a single function that takes your server implementation, and returns a node http server.

	var noddityServiceServer = require('noddity-service-server')

	var httpServer = noddityServiceServer(yourServerFunction)

	httpServer.start(8080)

Your server function will be passed to arguments: a big 'ol context object with everything you need to access a Noddity data store, and an error-first callback function whose second argument should be a string that will be returned in the response the client.

If you have a use case that could use streams, I would be open to a pull request to add that.

	function yourServerImplementation(context, cb) {
		var url = context.url
		var parameters = context.parameters
		var butler = context.butler
		var linkify = conxext.linkify
		var resolvePost = context.resolvePost

		if (typeof parameters.postName === 'undefined') {
			cb(new Error('Must provide the postName parameter!'))
		} else {
			butler.getPost(parameters.postName, function(err, post) {
				cb(err, 'The post title is: ' + post.metadata.title)
			})
		}
	}

The context parameters will be:

- url: the url from the http request
- parameters: an object whose parameters are the parameters that were passed in via the url.  The values will all be strings.
- butler: a [noddity-butler](https://github.com/TehShrike/noddity-butler) object pointing at the appropriate Noddity store
- linkify: a [noddity-linkifier](https://github.com/TehShrike/noddity-linkifier) function that will resolve post links to the appropriate url
- resolvePost: a dumb function that mashes up two parts of a url together (making sure not to double up on the slashes)

Check out [rssaas](https://github.com/TehShrike/rssaas) and [seoaas](https://github.com/TehShrike/seoaas) for examples of such services.

I like to launch these services with [ploy](https://github.com/substack/ploy).  To do the same, you can just create a server.js file containing something like

	var noddityServer = require('noddity-service-server')
	var thisParticularImplementation = require('./index.js')
	noddityServer(thisParticularImplementation).listen(process.env.PORT)

