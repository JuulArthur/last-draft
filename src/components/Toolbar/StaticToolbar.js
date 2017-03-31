/*
 * Copyright (c) 2016, Globo.com (https://github.com/globocom)
 * Copyright (c) 2016, vace.nz (https://github.com/vacenz)
 *
 * License: MIT
 */

import React, {Component} from 'react'
import {RichUtils} from 'draft-js'
import {ToolbarButton, PluginButton} from './ToolbarButton'
import LinkToolbar from './LinkToolbar'
import Header from './Header'
import {getSelectionCoords, getSelectedBlockElement} from '../../utils/selection'
import {hasEntity} from '../../utils/entity'
import styled from 'styled-components'
import insertDataBlock from '../../utils/insertDataBlock'

export default class extends Component {
  constructor (props) {
    super(props)
    this.state = {
      editingEntity: null,
      link: '',
      error: null,
      position: {},
      toolbarLeft: '-14px'
    }
    this.renderButton = ::this.renderButton
  }

  setError (errorMsg) {
    this.setState({error: errorMsg})
  }

  cancelError () {
    this.setState({error: null})
  }

  toggleInlineStyle (inlineStyle) {
    const newEditorState = RichUtils.toggleInlineStyle(this.props.editorState, inlineStyle)
    this.props.onChange(newEditorState)
  }

  toggleBlockStyle (blockType) {
    this.props.onChange(
      RichUtils.toggleBlockType(this.props.editorState, blockType)
    )
  }

  /* entity */
  toggleEntity (entity, active) {
    this.setState({editingEntity: entity})
  }

  removeEntity () {
    const selection = this.props.editorState.getSelection()
    if (!selection.isCollapsed()) {
      this.props.onChange(RichUtils.toggleLink(this.props.editorState, selection, null))
    }
    this.cancelEntity()
  }

  cancelEntity () {
    const {editorWrapper} = this.props
    editorWrapper && editorWrapper.focus()
    this.setState({ editingEntity: null, error: null })
  }

  setBarPosition () {
        this.setState({
        toolbarLeft: '-14px',
        position: {
          top: 0,
          left: 0
        }
      })
  }

  renderButton (item, position) {
    const {editorState} = this.props
    let current = null
    let toggle = null
    let active = null
    let key = item.label

    switch (item.type) {
      case 'inline': {
        current = editorState.getCurrentInlineStyle()
        toggle = () => this.toggleInlineStyle(item.style)
        active = current.has(item.style)
        break
      }
      case 'block': {
        const selection = editorState.getSelection()
        current = editorState
          .getCurrentContent()
          .getBlockForKey(selection.getStartKey())
          .getType()
        toggle = () => this.toggleBlockStyle(item.style)
        active = item.style === current
        break
      }
      case 'separator': {
        key = 'sep-' + position
        break
      }
      case 'entity': {
        const {entity = 'LINK'} = item
        key = 'entity-' + entity
        active = hasEntity(entity, editorState)
        toggle = () => this.toggleEntity(entity, active)
        break
      }
      case 'plugin': {
        return (
          <PluginButton
            theme={this.props.theme}
            tooltips={this.props.tooltips}
            uploadImageAsync={this.props.uploadImageAsync}
            uploadFile={this.props.uploadFile}
            editorState={this.props.editorState}
            onChange={::this.props.onChange}
            key={key}
            item={item} />
        )
      }
    }

    return (
      <ToolbarButton
        key={key}
        active={active}
        tooltips={this.props.tooltips}
        separators={this.props.separators}
        theme={this.props.theme}
        toggle={toggle}
        item={item} />
    )
  }

  renderToolbar () {
    const { editingEntity, showModal } = this.state

    let toolbar = null
    if (editingEntity === 'LINK') {
      toolbar = (
        <LinkToolbar
          {...this.props}
          setError={::this.setError}
          cancelError={::this.cancelError}
          cancelEntity={::this.cancelEntity}
          removeEntity={::this.removeEntity}
          entityType={this.state.editingEntity} />
      )
    } else if (showModal) {
      let Modal = this.state.modal
      toolbar = (
        <Modal
          {...this.props}
          insertDataBlock={insertDataBlock}
          submitHtmlModal={::this.submitHtmlModal}
          rangeLeft={this.state.rangeLeft} />
      )
    } else {
      let actionsLength = this.props.actions.length
      if(actionsLength > 0) {
        toolbar = (
          <ToolbarList onMouseDown={(e) => { e.preventDefault() }}>
            {this.props.actions.map(this.renderButton)}
          </ToolbarList>
        )
      }
    }

    this.updateHeaderIcon()
    return toolbar
  }

  updateHeaderIcon () {
    let headerCount = this.props.actions.filter((action) => {
      if (action.style) {
        if (action.style.includes('header')) { return action }
      }
    }).length

    /* If only 1 header, use the H icon */
    if (headerCount === 1) {
      this.props.actions.map((action) => {
        if (action.style) {
          if (action.style.includes('header')) { action.icon = Header }
        }
      })
    }
  }

  renderError () {
    return (
      <ToolbarError error={this.state.error} className='ld-toolbar-error'>
        {this.state.error}
      </ToolbarError>
    )
  }

  render () {
    const { position, error } = this.state
    const { theme } = this.props

    if (this.props.readOnly) { return null }

    let show = true
    let toolbarStyle = { display: 'block'}
    if (position !== undefined) {
      toolbarStyle = Object.assign(position, toolbarStyle)
      toolbarStyle = {...toolbarStyle}
    }

    return (
      <ToolbarWrapper showModal={this.state.showModal} theme={theme} ref='toolbarWrapper' style={toolbarStyle} className='ld-toolbar-wrapper'>
        <div style={{position: 'absolute', bottom: '15px'}}>
          <Toolbar toolbarLeft={this.state.toolbarLeft} ref='toolbar' error={error} theme={theme} className='ld-toolbar'>
            {this.renderToolbar()}
            {this.state.error && this.renderError()}
          </Toolbar>
        </div>
      </ToolbarWrapper>
    )
  }
}

const ToolbarWrapper = styled.div`
  font-family: Open Sans, sans-serif;
  color: ${props => props.theme.color};
  letter-spacing: -0.037rem;
  line-height: 1.75rem;
  height: 0;
  position: relative;
  z-index: 10;
`

const Toolbar = styled.div`
  background: ${props => props.error ? '#E83F26' : props.theme.backgroundColor};
  left: ${props => props.toolbarLeft};
  position: relative;
`

const ToolbarList = styled.ul`
  padding: 4px 6px;
  margin: 0;
  whiteSpace: nowrap;
`

const ToolbarError = styled.p`
  margin: ${props => props.error ? '-8px 0 0 20px' : '0'};
  height: ${props => props.error ? '28px' : '0'};
  padding-bottom: ${props => props.error ? '12px' : '0'};
  transition: height 0.2s ease-in-out;
  color: #FFF;
  font-size: 12px !important;
  font-weight: bold;
`
