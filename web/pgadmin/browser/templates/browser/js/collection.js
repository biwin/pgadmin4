define(
    ['jquery', 'underscore', 'underscore.string', 'pgadmin',
     'backbone', 'alertify', 'backform', 'pgadmin.backform',
     'pgadmin.backgrid', 'pgadmin.browser.node'
     ],
function($, _, S, pgAdmin, Backbone, Alertify, Backform) {

  var pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

  // It has already been defined.
  // Avoid running this script again.
  if (pgBrowser.Collection)
    return pgBrowser.Collection;

  pgBrowser.Collection = _.extend(_.clone(pgBrowser.Node), {
    ///////
    // Initialization function
    // Generally - used to register the menus for this type of node.
    //
    // Also, look at pgAdmin.Browser.add_menus(...) function.
    //
    // Collection will not have 'Properties' menu.
    //
    // NOTE: Override this for each node for initialization purpose
    Init: function() {
      if (this.node_initialized)
        return;
      this.node_initialized = true;
      pgAdmin.Browser.add_menus([{
        name: 'refresh', node: this.type, module: this,
        applies: ['object', 'context'], callback: 'refresh_node',
        priority: 1, label: '{{ _("Refresh...") }}',
        icon: 'fa fa-refresh'
      }]);
    },
    hasId: false,
    showProperties: function(item, data, panel) {
      var that = this,
        j = panel.$container.find('.obj_properties').first(),
        view = j.data('obj-view'),
        content = $('<div></div>')
          .addClass('pg-prop-content col-xs-12'),
        node = pgBrowser.Nodes[that.node],
        // This will be the URL, used for object manipulation.
        urlBase = this.generate_url(item, 'properties', data),
        collections = new (node.Collection.extend({
          url: urlBase,
          model: node.model
        }))(),
        info = this.getTreeNodeHierarchy.apply(this, [item]),
        gridSchema = Backform.generateGridColumnsFromModel(
            info, node.model, 'prorperties', that.columns
          ),
        // Initialize a new Grid instance
        grid = new Backgrid.Grid({
          columns: gridSchema.columns,
          collection: collections,
          className: "backgrid table-bordered"
        }),
        gridView = {
          'remove': function() {
            if (this.grid) {
              delete (this.grid);
              this.grid = null;
            }
          }
        };
        gridView.grid = grid;

      if (view) {
        // Release the view
        view.remove();
        // Deallocate the view
        delete view;
        view = null;
        // Reset the data object
        j.data('obj-view', null);
      }

      // Make sure the HTML element is empty.
      j.empty();
      j.data('obj-view', gridView);

      // Render subNode grid
      content.append(grid.render().$el);
      j.append(content);

      // Fetch Data
      collections.fetch({reset: true})
      .error(function(jqxhr, error, message) {
          Alertify.pgNotifier(
            error, jqxhr,
            S(
              "{{ _("Error fetching the properties - %%s!") }}"
              ).sprintf(message).value()
            );
        });
    },
    generate_url: function(item, type, d) {
      var url = pgAdmin.Browser.URL + '{TYPE}/{REDIRECT}{REF}',
        /*
         * Using list, and collections functions of a node to get the nodes
         * under the collection, and properties of the collection respectively.
         */
        opURL = {
          'properties': 'obj', 'children': 'nodes'
        },
        ref = '', self = this;

      _.each(
        _.sortBy(
          _.values(
           _.pick(
            this.getTreeNodeHierarchy(item), function(v, k, o) {
              return (k != self.type);
            })
           ),
          function(o) { return o.priority; }
          ),
        function(o) {
          ref = S('%s/%s').sprintf(ref, o.id).value();
        });

      var args = {
        'TYPE': self.node,
        'REDIRECT': (type in opURL ? opURL[type] : type),
        'REF': S('%s/').sprintf(ref).value()
      };

      return url.replace(/{(\w+)}/g, function(match, arg) {
        return args[arg];
      });
    }
  });

  return pgAdmin.Browser.Collection;
});