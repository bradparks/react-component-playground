require('./component-playground.less');

var _ = require('lodash'),
    React = require('react'),
    classNames = require('classnames'),
    ComponentTree = require('react-component-tree'),
    stringifyParams = require('react-querystring-router').uri.stringifyParams;

module.exports = React.createClass({
  /**
   * ComponentPlayground provides a minimal frame for loading React components
   * in isolation. It can either render the component full-screen or with the
   * navigation pane on the side.
   */
  displayName: 'ComponentPlayground',

  mixins: [ComponentTree.Mixin],

  propTypes: {
    components: React.PropTypes.object.isRequired,
    component: React.PropTypes.string,
    fixture: React.PropTypes.string,
    editor: React.PropTypes.bool,
    fullScreen: React.PropTypes.bool,
    containerClassName: React.PropTypes.string
  },

  statics: {
    getExpandedComponents: function(props, alreadyExpanded) {
      if (!props.component || _.contains(alreadyExpanded, props.component)) {
        return alreadyExpanded;
      }

      return alreadyExpanded.concat(props.component);
    },

    isFixtureSelected: function(props) {
      return props.component && props.fixture;
    },

    getSelectedComponentClass: function(props) {
      return props.components[props.component].class;
    },

    getSelectedFixtureContents: function(props) {
      return props.components[props.component]
                  .fixtures[props.fixture];
    },

    getSelectedFixtureUserInput: function(props) {
      return JSON.stringify(this.getSelectedFixtureContents(props), null, 2);
    },

    getFixtureState: function(props, expandedComponents) {
      var state = {
        expandedComponents:
            this.getExpandedComponents(props, expandedComponents),
        fixtureContents: {},
        fixtureUserInput: '{}',
        isFixtureUserInputValid: true
      };

      if (this.isFixtureSelected(props)) {
        _.assign(state, {
          fixtureContents: this.getSelectedFixtureContents(props),
          fixtureUserInput: this.getSelectedFixtureUserInput(props)
        });
      }

      return state;
    }
  },

  getDefaultProps: function() {
    return {
      editor: false,
      fullScreen: false
    };
  },

  getInitialState: function() {
    return this.constructor.getFixtureState(this.props, []);
  },

  children: {
    preview: function() {
      var params = {
        component: this.constructor.getSelectedComponentClass(this.props),
        // Child should re-render whenever fixture changes
        key: JSON.stringify(this.state.fixtureContents)
      };

      return _.merge(params, _.omit(this.state.fixtureContents, 'state'));
    }
  },

  render: function() {
    var isFixtureSelected = this.constructor.isFixtureSelected(this.props);

    var classes = classNames({
      'component-playground': true,
      'full-screen': this.props.fullScreen
    });

    return (
      <div className={classes}>
        <div className="header">
          {isFixtureSelected ? this._renderButtons() : null}
          <h1>
            <a ref="homeLink"
               href={stringifyParams({})}
               className="home-link"
               onClick={this.props.router.routeLink}>
              <span className="react">React</span> Component Playground
            </a>
            {!isFixtureSelected ? this._renderCosmosPlug() : null}
          </h1>
        </div>
        <div className="fixtures">
          {this._renderFixtures()}
        </div>
        {isFixtureSelected ? this._renderContentFrame() : null}
      </div>
    );
  },

  _renderCosmosPlug: function() {
    return <span ref="cosmosPlug" className="cosmos-plug">
      {'powered by '}
      <a href="https://github.com/skidding/cosmos">Cosmos</a>
    </span>;
  },

  _renderFixtures: function() {
    return <ul className="components">
      {_.map(this.props.components, function(component, componentName) {

        var classes = classNames({
          'component': true,
          'expanded': _.contains(this.state.expandedComponents, componentName)
        });

        return <li className={classes} key={componentName}>
          <p className="component-name">
            <a ref={componentName + 'Button'}
               href="#toggle-component"
               title={componentName}
               onClick={_.partial(this.onComponentClick, componentName)}>
              {componentName}
            </a>
          </p>
          {this._renderComponentFixtures(componentName, component.fixtures)}
        </li>;

      }.bind(this))}
    </ul>
  },

  _renderComponentFixtures: function(componentName, fixtures) {
    return <ul className="component-fixtures">
      {_.map(fixtures, function(props, fixtureName) {

        var fixtureProps = {
          component: componentName,
          fixture: fixtureName,
          editor: this.props.editor
        };

        return <li className={this._getFixtureClasses(componentName,
                                                      fixtureName)}
                   key={fixtureName}>
          <a ref={componentName + fixtureName + 'Button'}
             href={stringifyParams(fixtureProps)}
             title={fixtureName}
             onClick={this.props.router.routeLink}>
            {fixtureName}
          </a>
        </li>;

      }.bind(this))}
    </ul>;
  },

  _renderContentFrame: function() {
    return <div className="content-frame">
      <div ref="previewContainer" className={this._getPreviewClasses()}>
        {this.loadChild('preview')}
      </div>
      {this.props.editor ? this._renderFixtureEditor() : null}
    </div>
  },

  _renderFixtureEditor: function() {
    var editorClasses = classNames({
      'fixture-editor': true,
      'invalid-syntax': !this.state.isFixtureUserInputValid
    });

    return <div className="fixture-editor-outer">
      <textarea ref="editor"
                className={editorClasses}
                value={this.state.fixtureUserInput}
                onChange={this.onFixtureChange}>
      </textarea>
    </div>;
  },

  _renderButtons: function() {
    return <ul className="buttons">
      {this._renderFixtureEditorButton()}
      {this._renderFullScreenButton()}
    </ul>;
  },

  _renderFixtureEditorButton: function() {
    var classes = classNames({
      'fixture-editor-button': true,
      'selected-button': this.props.editor
    });

    var editorUrlProps = {
      editor: !this.props.editor,
      component: this.props.component,
      fixture: this.props.fixture
    };

    return <li className={classes}>
      <a href={stringifyParams(editorUrlProps)}
         ref="editorButton"
         onClick={this.props.router.routeLink}>Editor</a>
    </li>;
  },

  _renderFullScreenButton: function() {
    var fullScreenUrl = stringifyParams({
      component: this.props.component,
      fixture: this.props.fixture,
      fullScreen: true
    });

    return <li className="full-screen-button">
      <a href={fullScreenUrl}
         ref="fullScreenButton"
         onClick={this.props.router.routeLink}>Fullscreen</a>
    </li>;
  },

  componentDidMount: function() {
    if (this.refs.preview) {
      this._injectPreviewChildState();
    }
  },

  componentWillReceiveProps: function(nextProps) {
    if (nextProps.component !== this.props.component ||
        nextProps.fixture !== this.props.fixture) {
      this.setState(this.constructor.getFixtureState(
          nextProps, this.state.expandedComponents));
    }
  },

  componentDidUpdate: function(prevProps, prevState) {
    if (this.refs.preview && (
        // Avoid deep comparing the fixture contents when component and/or
        // fixture changed, because it's more expensive
        this.props.component !== prevProps.component ||
        this.props.fixture !== prevProps.fixture ||
        !_.isEqual(this.state.fixtureContents, prevState.fixtureContents))) {
      this._injectPreviewChildState();
    }
  },

  onComponentClick: function(componentName, event) {
    event.preventDefault();

    var currentlyExpanded = this.state.expandedComponents,
        componentIndex = currentlyExpanded.indexOf(componentName),
        toBeExpanded;

    if (componentIndex !== -1) {
      toBeExpanded = _.clone(currentlyExpanded);
      toBeExpanded.splice(componentIndex, 1);
    } else {
      toBeExpanded = currentlyExpanded.concat(componentName);
    }

    this.setState({expandedComponents: toBeExpanded});
  },

  onFixtureChange: function(event) {
    var userInput = event.target.value,
        newState = {fixtureUserInput: userInput};

    try {
      var fixtureContents =
          _.cloneDeep(this.constructor.getSelectedFixtureContents(this.props));

      if (userInput) {
        _.merge(fixtureContents, JSON.parse(userInput));
      }

      newState.fixtureContents = fixtureContents;
      newState.isFixtureUserInputValid = true;
    } catch (e) {
      newState.isFixtureUserInputValid = false;
      console.error(e);
    }

    this.setState(newState);
  },

  _getPreviewClasses: function() {
    var classes = {
      'preview': true,
      'aside-fixture-editor': this.props.editor
    };

    if (this.props.containerClassName) {
      classes[this.props.containerClassName] = true;
    }

    return classNames(classes);
  },

  _getFixtureClasses: function(componentName, fixtureName) {
    var classes = {
      'component-fixture': true
    };

    classes['selected'] = componentName === this.props.component &&
                          fixtureName === this.props.fixture;

    return classNames(classes);
  },

  _injectPreviewChildState: function() {
    var state = this.state.fixtureContents.state;

    if (!_.isEmpty(state)) {
      ComponentTree.injectState(this.refs.preview, _.cloneDeep(state));
    }
  }
});
