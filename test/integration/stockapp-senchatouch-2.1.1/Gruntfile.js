module.exports = function(grunt) {

    grunt.initConfig({
        // Before generating any new files, remove any previously-created files.
        clean: {
          app: ['dest']
        },

        sencha_dependencies: {
          app: {
            src: "."
          }
        },

        uglify: {
            app: {
              options: {
                sourceMap: 'dest/source-map.map',
                sourceMappingURL: './source-map.map',
                sourceMapRoot: '..'
              },
              files: {
                'dest/app.min.js': ['<%= sencha_dependencies_app %>']
              }
            }
        },

        copy: {
          app: {
            files: [
              {src: ['resources/**'], dest: 'dest/'},
              {src: ['index.html'], dest: 'dest/'},
            ],
            options: {
              processContent: function(content, filePath) {
                if (/index.html/.test(filePath)) {
                  // remove the ext script
                  content = content.replace(/<script.*id="microloader".*><\/script>/, '<script src="app.min.js"></script><link rel="stylesheet" href="resources/css/app.css">');
                  // now update the css location
                  content = content.replace(/\.\.\/libs\/ext-4.1.1a\//, '');
                  return content.replace(/app\/app.js/, 'app.min.js');
                }
                return content;
              }
            }
          }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadTasks('../../../tasks');

    grunt.registerTask('default', ['clean:app', 'sencha_dependencies:app', 'uglify:app', 'copy:app']);

};
