import React, { PureComponent } from 'react';
import { Table, Input, InputNumber, Form } from 'antd';
import TimePicker from '@/components/TimePicker';

// import styles from './index.less';

const FormItem = Form.Item;
const EditableContext = React.createContext('');

/**
 * 可编辑单元格
 */
class EditableCell extends React.Component {
  getInput = () => {
    const { inputtype, dateprops } = this.props;
    let component = <Input />;
    if (inputtype === 'number') {
      component = <InputNumber />;
    } else if (inputtype === 'date') {
      component = <TimePicker disabledDate={dateprops.disabledDate} />;
    }
    return component;
  };

  render() {
    const {
      editing,
      dataIndex,
      title,
      record,
      required,
      inputtype,
      dateprops,
      ...restProps
    } = this.props;
    return (
      <EditableContext.Consumer>
        {form => {
          const { getFieldDecorator } = form;
          return (
            <td {...restProps}>
              {/* 正在编辑的行，绑定列到表单 */}
              {editing ? (
                <FormItem style={{ margin: 0 }}>
                  {getFieldDecorator(dataIndex, {
                    rules: [
                      {
                        required,
                        message: `请输入 ${title}!`,
                      },
                    ],
                    initialValue: record[dataIndex],
                  })(this.getInput())}
                </FormItem>
              ) : (
                restProps.children
              )}
            </td>
          );
        }}
      </EditableContext.Consumer>
    );
  }
}

/* eslint react/no-multi-comp:0 */
/**
 * 可编辑表格
 */
@Form.create()
class EditableTable extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      dataSource: props.dataSource, // 表格数据
      editingKey: '', // 正在编辑的行的主键
    };
    // 编辑列属性
    this.operationColumn = {
      title: '编辑',
      dataIndex: 'edit',
      render: (text, record) => {
        const { editingKey } = this.state;
        const { rowKey } = this.props;
        const editable = this.isEditing(record);
        return (
          <div>
            {editable ? (
              <span>
                <EditableContext.Consumer>
                  {/* 消费Context 值为表单对象 */}
                  {form => (
                    <a
                      href="#"
                      onClick={() => this.save(form, record[rowKey])}
                      style={{ marginRight: 8 }}
                    >
                      Save
                    </a>
                  )}
                </EditableContext.Consumer>
                <a onClick={() => this.cancel(record[rowKey])}>Cancel</a>
              </span>
            ) : (
              <a disabled={editingKey !== ''} onClick={() => this.edit(record[rowKey])}>
                Edit
              </a>
            )}
          </div>
        );
      },
    };
  }

  /**
   * 生命周期：接收props
   * 将props变化同步到state
   * @param nextProps
   * @param nextContext
   */
  componentWillReceiveProps(nextProps, nextContext) {
    nextContext.toString();
    this.setState({
      dataSource: nextProps.dataSource,
    });
  }

  /**
   * 行正在被编辑
   * @param record
   * @returns {boolean}
   */
  isEditing = record => {
    const { rowKey } = this.props;
    const { editingKey } = this.state;
    return record[rowKey] === editingKey;
  };

  /**
   * 取消编辑
   */
  cancel = () => {
    this.setState({ editingKey: '' });
  };

  /**
   * 保存编辑结果
   * @param form
   * @param key
   */
  save = (form, key) => {
    const { rowKey, handleTableSave } = this.props;
    const { dataSource } = this.state;
    form.validateFields((error, row) => {
      if (error) return;
      // 根据当前编辑行的主键获取在表格数据数组的下标
      const index = dataSource.findIndex(item => key === item[rowKey]);
      if (index > -1) {
        // 编辑行
        const item = dataSource[index]; // 编辑行的原数据
        // { ...item, ...row, } 编辑后数据覆盖原数据
        const newRow = { ...item, ...row };
        /* arrayObject.splice(index,howMany,item1,.....,itemX)
          index	必需。整数，规定添加/删除项目的位置，使用负数可从数组结尾处规定位置。
          howMany	必需。要删除的项目数量。如果设置为 0，则不会删除项目。
          item1, ..., itemX	可选。向数组添加的新项目。
          此处将index下标的元素删除，替换为新的对象
          */
        dataSource.splice(index, 1, newRow);
        handleTableSave(newRow);
        this.setState({ dataSource, editingKey: '' });
      } else {
        // 新增行
        dataSource.push(row);
        this.setState({ dataSource, editingKey: '' });
      }
    });
  };

  /**
   * 编辑行
   * @param key
   */
  edit(key) {
    this.setState({ editingKey: key });
  }

  render() {
    /**
     * 将表单的默认单元格组件替换成EditableCell组件
     * EditableCell的属性由列的onCell设置
     * @type {{body: {cell: EditableCell}}}
     */
    const components = {
      body: {
        cell: EditableCell,
      },
    };

    const { dataSource } = this.state;
    const { columns, rowKey, pagination, form, disabledDate } = this.props;

    /**
     * 为可编辑列，添加onCell属性
     */
    const tableColumns = [...columns, this.operationColumn].map(col => {
      if (!col.editable) {
        // 列不能编辑
        return col;
      }
      return {
        // 列能编辑
        ...col,
        // onCell	设置单元格属性	Function(record, rowIndex)	-
        onCell: record => ({
          record,
          inputtype: col.inputType ? col.inputType : 'text',
          dataIndex: col.dataIndex,
          title: col.title,
          editing: this.isEditing(record),
          required: col.required === undefined ? true : col.required,
          dateprops: col.inputType === 'date' ? { disabledDate } : null,
        }),
      };
    });

    return (
      // 提供Context 值为form对象
      <EditableContext.Provider value={form}>
        <Table
          rowKey={rowKey || 'key'}
          // components	覆盖默认的 table 元素	TableComponents	-
          components={components}
          bordered
          dataSource={dataSource}
          columns={tableColumns}
          rowClassName="editable-row"
          pagination={pagination}
        />
      </EditableContext.Provider>
    );
  }
}

export default EditableTable;
