var FormData = Npm.require('form-data');

Meteor.startup(function () {
    Meteor.methods({
        saveImageMap: function (data, orbitId) {
            if (this.userId) {
                var name = this.userId + "-" + orbitId;
                var form = new FormData();
                form.append('img',data);
                form.append('name',name);

                form.submit('http://www.friendsinspace.org/images/save.php', function(err, res) {
                    if (err) {
                        console.error(err);
                    }
                });
                return "http://www.friendsinspace.org/images/" + name + ".png";
            }
            return null;
        }
    });
});