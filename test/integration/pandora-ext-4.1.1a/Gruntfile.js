module.exports = function(grunt) {

    grunt.initConfig({
        sencha_dependencies: {
          app: {
            options : {
              appFile: 'app/app.js',
              senchaDir: '../libs/ext-4.1.1a'
            }
          }
        },

        uglify: {
            app: {
              options: {
                sourceMap: 'dest/source-map.js'
              },
              files: {
                'dest/output.min.js': ['<%= sencha_dependencies_app %>']
              }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadTasks('../../../tasks');

    grunt.registerTask('default', ['sencha_dependencies:app', 'uglify:app']);

};
