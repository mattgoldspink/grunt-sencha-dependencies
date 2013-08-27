# grunt-sencha-dependencies [![Build Status](https://api.travis-ci.org/mattgoldspink/grunt-sencha-dependencies.png?branch=master)](https://travis-ci.org/mattgoldspink/grunt-sencha-dependencies)

> A Grunt.js plugin which will figure out the order of Ext classes your Ext.application uses and any additional &lt;script&gt; tags (see `options.includeAllScriptTags` for details on this) so the list can be passed on to further commands like concat, jshint, uglify.

## Getting Started

```bash
npm install grunt-sencha-dependencies --save-dev
```

Once that's done, add this line to your project's Gruntfile:

```js
grunt.loadNpmTasks('grunt-sencha-dependencies');
```

If the plugin has been installed correctly, running `grunt --help` at the command line should list the newly-installed plugin's task or tasks. In addition, the plugin should be listed in package.json as a `devDependency`, which ensures that it will be installed whenever the `npm install` command is run.

[grunt]: http://gruntjs.com/
[Getting Started]: https://github.com/gruntjs/grunt/blob/devel/docs/getting_started.md
[package.json]: https://npmjs.org/doc/json.html

## The "sencha_dependencies" task

This task tasks a Sencha Touch or Ext.js project and will setup 3 properties with all of the Ext class file dependencies in the correct order for concatenation. The properties generated are:

- `sencha_dependencies_{target}` - All the files your application depends on in the correct dependency order for starting up (including the `ext-debug.js` or `sencha-touch-debug.js` and the file containing your `Ext.application`)
- `sencha_dependencies_{target}_ext_core` - A subset of the above that includes only the files from the core Ext.js or Sencha Touch framework
- `sencha_dependencies_{target}_app` - A subset of `sencha_dependencies_{target}` which includes only the files that are not in `sencha_dependencies_{target}_ext_core`

Where `{target}` is the name of your target in the Grunt configuration. For example if you configuration was:

```js
grunt.initConfig({
  sencha_dependencies: {
    prod:  "."
  }
})
```
Your target is `prod` and hence the properties generaties would be `sencha_dependencies_prod`, `sencha_dependencies_prod_ext_core` and `sencha_dependencies_prod_app`.

### Quick start - if you previously used Sencha Cmd

If you have previously used Sencha Cmd and have an app.json file in your project then all you'll need to configure is the task to point to this directory.

For example if you're running grunt in the same directory as your app.json it would be:

```js
grunt.initConfig({
  sencha_dependencies: {
    dist:  "."
  }
})
```

If it's in a different directory then change it to point to that.

```js
grunt.initConfig({
  sencha_dependencies: {
    dist:  "./my-sencha-app"
  }
})
```

To pass the found files into another task you need to use the dynamic property style syntax:

```js
grunt.initConfig({
  sencha_dependencies: {
    dist:  "."
  },
  concat: {
    dist: {
      src: '<%= sencha_dependencies_dist %>',
      dest: 'build/app.js',
    }
  }
})
```

Note: You shouldn't need any of the below options unless you have more than 2 files listed in your app.json js property. In which case you will be asked to set the appJs property to name the one which contains you `Ext.application` call.

### Options

These options are for people who don't start with an app.json file generated from Sencha Cmd.

#### options.pageRoot
Type: `String`
Default value: Directory in which grunt is run

Set this to be relative to the directory from which you run grunt.

#### options.pageToProcess
Type: `String`
Default value: `undefined`

The name of your main html page, usually `index.html`. This will be used by phantomjs and run headlessly to figure out what classes and &lt;script&gt; tags are loaded.

#### options.appJs
Type: `String`
Default value: undefined

This should be the string path to your file which contains the `Ext.application` call which initialises your application. This should be set relative to the `pageRoot` property. If you're running this task against a project generated with Sencha Cmd and you have more than 2 files listed in your app.json js property then you should set this value to be the name of the one which contains your `Ext.application`.

#### options.senchaDir
Type: `String`
Default value: undefined

This property is only needed in the case where you don't set the `pageToProcess` property.

This is the location of the Sencha install. It should be the unzipped install as it comes from Sencha - i.e. don't modify the folder layout in there. This should be set relative to the `pageRoot` property.

#### options.includeAllScriptTags
Type: `Boolean`
Default value: true

By default the task not only checks Ext.History to see what files Ext loaded, but it also looks at all of the &lt;script/&gt; tags in the page and adds them into the resulting list in the correct order. This can be useful when you include non-Sencha/Ext files in your page that you still want evaluated or concated in later tasks.

Setting this option to false will cause all the additional &lt;script/&gt; tags to be ignored by this step.

### Usage Examples for non Sencha Cmd generated apps

The below examples show how to configure the task with an application which hasn't used Sencha Cmd or doesn't have an app.json file.

#### Basic example

In this example the Ext.application is defined in a file called `app.js` in the `js` folder, our page is called `index.html` and we're running grunt in the same directory as it
The generated array of ordered files will be in a global variable called `sencha_dependencies_dist`

```js
grunt.initConfig({
  sencha_dependencies: {
    dist: {
      options: {
        appJs: './js/app.js',
        pageToProcess: 'index.html'
      }
    }
  }
})
```

####  How to use this with subsequent steps

You can now use this generated array with other tasks - for example the most common use case is to concatenate these files together in the right order.

Below is the simplest example. Note that you need to use the template syntax `<% %>` because at the time the JavaScript is evaluated in the below config the actual `sencha_dependencies` task will not have been run.

```js
grunt.initConfig({
  sencha_dependencies: {
    dist: {
      options: {
        appJs: './js/app.js',
        pageToProcess: 'index.html'
      }
    }
  },
  concat: {
      dist: {
        src: '<%= sencha_dependencies_dist %>',
        dest: 'build/app.js',
      }
    }
});

grunt.loadNpmTasks('grunt-contrib-concat');
grunt.loadNpmTasks('grunt-sencha-dependencies');

grunt.registerTask('dist', ['sencha_dependencies:dist', 'concat:dist']);
```

#### Running JSHint on just your app classes

The task finds all the classes you depend on, from your app and Sencha's frameworks, but often you'll just want to run some tasks over your app files. The common example is running JSHint to validate your source code. The `sencha_dependencies` task produces 3 output properties one of which is all the non-sencha framework files, to use this:

```js
grunt.initConfig({
  sencha_dependencies: {
    dist: {
      options: {
        appJs: './js/app.js',
        pageToProcess: 'index.html'
      }
    }
  },
  jshint: {
    dist: '<%= sencha_dependencies_dist_app %>'
  }
});

grunt.loadNpmTasks('grunt-contrib-jshint');
grunt.loadNpmTasks('grunt-sencha-dependencies');

grunt.registerTask('hint', ['sencha_dependencies:dist', 'jshint:dist']);
```

### Larger examples

Included in the repository is a copy of some of the Ext.js and Sencha Touch examples. All the grunt files in these examples figure out the dependencies, then minify & concat the source using UglifyJS and also generate source-maps which can be used to debug the actual source code files on a minified file. Finally the output is all written to the `dest` folder in that same directory.

- ```tests/integration/pandora-ext-4.1.1a``` - is the Ext 4.1.1a Pandora MVC example, it doesn't not use Sencha Cmd and shows how to configure a build when that has not been used
- ```tests/integration/stockapp-senchatouch-2.1.1``` - A Sencha Touch 2.1.1 example using Touch Charts originally generated using Sencha Cmd and shows how to configure a build with a pre-existing app.json file
- ```tests/integration/touchtweets-2.1.1``` - A Sencha Touch 2.1.1 example using MVC which was originally generated using Sencha Cmd and shows how to configure a build with a pre-existing app.json file

#### When you're running grunt from a different directory to your index.html page

If you have you page(s) in a different directory to where you run grunt then you need to set the `pageRoot` property. For example if your directories are structured like so:

```
app
|-- Gruntfile.js
|-- package.json
+-- www
    |-- index.html
    +-- js
    |    |-- app.js
    |    +-- app
    +-- lib
         +-- sencha-touch-2.1.0
```

Then your config for the grunt task should look like:

```js
grunt.initConfig({
  sencha_dependencies: {
    prod: {
      options: {
        pageRoot: './www', // relative to dir where grunt will be run
        appJs: 'js/app.js', // relative to www
        pageToProcess: 'index.html' // relative to www
      }
    }
  }
})
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style, some of it is enforced by JSHint for you. Add unit tests for any new or changed functionality. Lint and test your code using [grunt][].

## Release History

- 0.7.2 - Allow app.js to be undefined
- 0.7.1 - Fixing path issues that were causing problems on Windows
- 0.7.0 - Kick off http server to avoid FD limits in PhantomJS
- 0.6.8 - Added support to ignore all Script tags if needed - see `options.includeAllScriptTags`
- 0.6.7 - Fixed bug #29
- 0.6.6 - Remove hardcoded path seperators to enable it to work on Windows
- 0.6.5 - Removing large test dependencies to reduce download size
- 0.6.4 - Don't stat non local files (Thanks to Alan Shaw)
- 0.6.3 - Improved error reporting for JS errors from PhantomJS
- 0.6.0 - Introduced the capability to use the index.html page of a project to simplify things further. Note the following properties are now dropped: `isTouch`, `mode`, `printDepGraph`
- 0.5.2 - Now generate 3 properties of files: sencha_dependencies_{target}, sencha_dependencies_{target}_ext_core and sencha_dependencies_{target}_app
- 0.5.1 - Added support to use app.json from Sencha Cmd to make it easier for existing users to migrate
- 0.5.0 - Switched the default mode to use PhantomJs to capture the loaded classes
- 0.4.0 - Added pageRoot support for when your index.html is not in the root directory
- 0.2.5 - Initial Touch support - tested against the Sencha Stock App - likely still bugs with other apps though
- 0.2.4 - Fixed bugs which prevented it working on the Ext.js Pandora example MVC application and added some new properties to help with debugging
