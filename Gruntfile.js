module.exports = function(grunt) {
    grunt.initConfig({
        mocha: {
            browser: ['test/**/*.html'],
            options: {
                reporter: 'Nyan',
                run: true
            }
        }
    });

    grunt.loadNpmTasks('grunt-mocha');

    grunt.registerTask('test', ['mocha']);
};